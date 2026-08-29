import {
    NavigationAPI,
    type LoginRequest,
    type ExportData,
    type Group,
    type Site,
    type Env,
} from "../src/API/http";
import { DEFAULT_AI_SYSTEM_PROMPT } from "../src/API/ai";

/**
 * 简单的内存速率限制器
 * 注意: 这是基于单个 Worker 实例的内存限制
 * 生产环境建议使用 Cloudflare KV 实现跨实例的速率限制
 */
class SimpleRateLimiter {
    private requests: Map<string, { count: number; resetTime: number }> = new Map();
    private readonly maxRequests: number;
    private readonly windowMs: number;

    constructor(maxRequests: number = 5, windowMinutes: number = 15) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMinutes * 60 * 1000;
    }

    /**
     * 检查是否超过速率限制
     * @param identifier 唯一标识符 (如 IP 地址)
     * @returns 如果允许请求返回 true,否则返回 false
     */
    check(identifier: string): boolean {
        const now = Date.now();
        const record = this.requests.get(identifier);

        // 清理过期记录
        if (record && now > record.resetTime) {
            this.requests.delete(identifier);
        }

        // 获取或创建记录
        const current = this.requests.get(identifier) || {
            count: 0,
            resetTime: now + this.windowMs
        };

        // 检查是否超限
        if (current.count >= this.maxRequests) {
            return false;
        }

        // 增加计数
        current.count++;
        this.requests.set(identifier, current);
        return true;
    }

    /**
     * 获取剩余请求次数
     */
    getRemaining(identifier: string): number {
        const record = this.requests.get(identifier);
        if (!record || Date.now() > record.resetTime) {
            return this.maxRequests;
        }
        return Math.max(0, this.maxRequests - record.count);
    }
}

// 创建登录端点速率限制器: 5次尝试/15分钟
const loginRateLimiter = new SimpleRateLimiter(5, 15);

// AI 聊天速率限制: 20次/分钟/IP（功能开启后访客可免登录使用，需限流防滥用）
const aiChatRateLimiter = new SimpleRateLimiter(20, 1);


/**
 * 只读路由白名单 - 这些路由在 AUTH_REQUIRED_FOR_READ=false 时无需认证
 */
const READ_ONLY_ROUTES = [
    { method: 'GET', path: '/api/groups' },
    { method: 'GET', path: '/api/sites' },
    { method: 'GET', path: '/api/configs' },
    { method: 'GET', path: '/api/groups-with-sites' },
] as const;

// ========== AI 辅助：API 密钥 AES-256-GCM 加密（防泄漏） ==========
// 安全模型：密钥明文只存在于浏览器 → Worker 的 HTTPS 传输过程中；
// 入库前用 WebCrypto AES-GCM 加密存储，加密密钥由 AI_SECRET（未配置则兜底 AUTH_SECRET）
// 经 SHA-256 派生。前端接口（configs / ai/settings / export）绝不返回密钥明文或密文。

function bufToHex(buf: ArrayBuffer | Uint8Array): string {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

function hexToBuf(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

async function getAIEncryptionKey(env: Env): Promise<CryptoKey | null> {
    const secret = env.AI_SECRET || env.AUTH_SECRET;
    if (!secret) return null;
    const rawKey = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
    return crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, [
        "encrypt",
        "decrypt",
    ]);
}

/** 加密明文 API 密钥 → `ivHex:dataHex`；未配置 AI_SECRET / AUTH_SECRET 时返回 null */
async function encryptAISecret(plain: string, env: Env): Promise<string | null> {
    const key = await getAIEncryptionKey(env);
    if (!key) return null;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipherBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        new TextEncoder().encode(plain)
    );
    return `${bufToHex(iv.buffer)}:${bufToHex(cipherBuffer)}`;
}

/** 解密存储的密钥 → 明文；解密失败（密钥被重置 / 数据损坏）返回 null */
async function decryptAISecret(stored: string, env: Env): Promise<string | null> {
    const key = await getAIEncryptionKey(env);
    if (!key) return null;
    const [ivHex, dataHex] = stored.split(":");
    if (!ivHex || !dataHex) return null;
    try {
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: hexToBuf(ivHex) },
            key,
            hexToBuf(dataHex)
        );
        return new TextDecoder().decode(decrypted);
    } catch {
        return null;
    }
}

/**
 * 判断主机名是否为禁止回源的本地/内网/保留地址（防 SSRF，供图标代理使用）
 */
function isBlockedHost(hostname: string): boolean {
    const host = hostname.toLowerCase().replace(/^\[|\]$/g, ''); // 去掉 IPv6 方括号
    const BLOCKED_HOSTNAMES = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
    if (BLOCKED_HOSTNAMES.includes(host)) return true;

    const PRIVATE_PATTERNS = [
        /^10\./, // 10.0.0.0/8
        /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
        /^192\.168\./, // 192.168.0.0/16
        /^169\.254\./, // 169.254.0.0/16 Link-local
        /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // 100.64.0.0/10 CGNAT
        /^0\./, // 0.0.0.0/8
        /^fe80:/i, // IPv6 link-local
        /^fc/i, // IPv6 unique local fc00::/7
        /^::1$/i, // IPv6 loopback
    ];
    return PRIVATE_PATTERNS.some((pattern) => pattern.test(host));
}

/**
 * 生成唯一错误 ID
 */
function generateErrorId(): string {
    return crypto.randomUUID();
}

/**
 * 结构化日志
 */
interface LogData {
    timestamp?: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    errorId?: string;
    path?: string;
    method?: string;
    details?: unknown;
}

function log(data: LogData): void {
    console.log(JSON.stringify({
        ...data,
        timestamp: data.timestamp || new Date().toISOString(),
    }));
}

/**
 * 创建错误响应
 */
function createErrorResponse(
    error: unknown,
    request: Request,
    context?: string
): Response {
    const errorId = generateErrorId();
    const url = new URL(request.url);

    // 记录详细错误日志
    log({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: error instanceof Error ? error.message : '未知错误',
        errorId,
        path: url.pathname,
        method: request.method,
        details: error instanceof Error ? {
            name: error.name,
            stack: error.stack,
        } : error,
    });

    // 返回用户友好的错误信息
    return createJsonResponse(
        {
            success: false,
            message: context ? `${context}失败` : '处理请求时发生错误',
            errorId,
        },
        request,
        { status: 500 }
    );
}

// 请求体大小限制配置
const MAX_BODY_SIZE = 1024 * 1024; // 1MB

/**
 * 验证请求体大小并解析 JSON
 */
async function validateRequestBody(request: Request): Promise<unknown> {
    const contentLength = request.headers.get('Content-Length');

    // 检查 Content-Length 头
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
        throw new Error('请求体过大，最大允许 1MB');
    }

    // 读取并验证实际大小
    const bodyText = await request.text();

    if (bodyText.length > MAX_BODY_SIZE) {
        throw new Error('请求体过大，最大允许 1MB');
    }

    try {
        return JSON.parse(bodyText);
    } catch {
        throw new Error('无效的 JSON 格式');
    }
}

/**
 * 深度验证导出数据
 */
function validateExportData(data: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
        errors.push('数据必须是对象');
        return { valid: false, errors };
    }

    const d = data as Record<string, unknown>;

    // 验证 version
    if (!d.version || typeof d.version !== 'string') {
        errors.push('缺少或无效的版本信息');
    }

    // 验证 exportDate
    if (!d.exportDate || typeof d.exportDate !== 'string') {
        errors.push('缺少或无效的导出日期');
    }

    // 验证 groups
    if (!Array.isArray(d.groups)) {
        errors.push('groups 必须是数组');
    } else {
        d.groups.forEach((group: unknown, index: number) => {
            if (!group || typeof group !== 'object') {
                errors.push(`groups[${index}]: 必须是对象`);
                return;
            }
            const g = group as Record<string, unknown>;
            if (!g.name || typeof g.name !== 'string') {
                errors.push(`groups[${index}]: name 必须是字符串`);
            }
            if (typeof g.order_num !== 'number') {
                errors.push(`groups[${index}]: order_num 必须是数字`);
            }
        });
    }

    // 验证 sites
    if (!Array.isArray(d.sites)) {
        errors.push('sites 必须是数组');
    } else {
        d.sites.forEach((site: unknown, index: number) => {
            if (!site || typeof site !== 'object') {
                errors.push(`sites[${index}]: 必须是对象`);
                return;
            }
            const s = site as Record<string, unknown>;
            if (!s.name || typeof s.name !== 'string') {
                errors.push(`sites[${index}]: name 必须是字符串`);
            }
            if (!s.url || typeof s.url !== 'string') {
                errors.push(`sites[${index}]: url 必须是字符串`);
            } else {
                try {
                    new URL(s.url);
                } catch {
                    errors.push(`sites[${index}]: url 格式无效`);
                }
            }
            if (typeof s.group_id !== 'number') {
                errors.push(`sites[${index}]: group_id 必须是数字`);
            }
            if (typeof s.order_num !== 'number') {
                errors.push(`sites[${index}]: order_num 必须是数字`);
            }
        });
    }

    // 验证 configs
    if (!d.configs || typeof d.configs !== 'object') {
        errors.push('configs 必须是对象');
    }

    return { valid: errors.length === 0, errors };
}
function getCorsHeaders(request: Request): Record<string, string> {
    const origin = request.headers.get('Origin');
    
    /**
     * 修改逻辑：
     * 书签脚本会在各种不同的域名下运行，因此我们无法预知所有 Origin。
     * 为了兼容书签脚本，我们需要将请求的 origin 直接反射回去。
     * 
     * 注意：由于下方设置了 'Access-Control-Allow-Credentials': 'true'，
     * 所以这里绝对不能返回通配符 '*'，必须返回具体的域名。
     */
    const finalOrigin = origin || '*';

    return {
        'Access-Control-Allow-Origin': finalOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
    };
}


/**
 * 创建带 CORS 头的 JSON 响应
 */
function createJsonResponse(
    data: unknown,
    request: Request,
    options: ResponseInit = {}
): Response {
    const corsHeaders = getCorsHeaders(request);

    return Response.json(data, {
        ...options,
        headers: {
            ...corsHeaders,
            ...(options.headers as Record<string, string>),
        },
    });
}

/**
 * 只读接口的缓存头（性能优化）：
 * - 未认证的访客请求：浏览器每次回源验证（max-age=0），但允许 Cloudflare
 *   边缘缓存 30s（s-maxage=30），同一波访客共享一次 D1 查询，显著降低
 *   数据库读压力与首屏等待。访客数据只含公开分组/站点，无隐私风险。
 * - 已认证请求：不走缓存（管理员改动后需立即可见，且响应含私有配置）。
 */
function readCacheHeaders(isAuthenticated: boolean): Record<string, string> {
    return isAuthenticated
        ? {}
        : { "Cache-Control": "public, max-age=0, s-maxage=30" };
}

/**
 * 创建带 CORS 头的普通响应
 */
function createResponse(
    body: string | null,
    request: Request,
    options: ResponseInit = {}
): Response {
    const corsHeaders = getCorsHeaders(request);

    return new Response(body, {
        ...options,
        headers: {
            ...corsHeaders,
            ...(options.headers as Record<string, string>),
        },
    });
}

export default {
    async fetch(request: Request, env: Env) {
        const url = new URL(request.url);

        // 处理 CORS 预检请求
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: getCorsHeaders(request),
            });
        }

        // API路由处理
        if (url.pathname.startsWith("/api/")) {
            const path = url.pathname.replace("/api/", "");
            const method = request.method;

            try {
                const api = new NavigationAPI(env);

                // 自动初始化数据库（幂等操作，已初始化则跳过）
                // 确保 groups/sites/configs 表存在，避免查询时报 500
                try {
                    await api.initDB();
                } catch (initError) {
                    log({
                        level: 'warn',
                        message: '数据库自动初始化失败',
                        path: url.pathname,
                        method,
                        details: initError instanceof Error ? initError.message : initError,
                    });
                }

                // 登录路由 - 不需要验证

                if (path === "login" && method === "POST") {
                    try {
                        // 速率限制检查
                        const clientIP = request.headers.get('CF-Connecting-IP') ||
                                       request.headers.get('X-Forwarded-For') ||
                                       'unknown';

                        if (!loginRateLimiter.check(clientIP)) {
                            const remaining = loginRateLimiter.getRemaining(clientIP);
                            log({
                                level: 'warn',
                                message: '登录速率限制触发',
                                path: '/api/login',
                                method: 'POST',
                                details: { clientIP, remaining }
                            });

                            return createJsonResponse(
                                {
                                    success: false,
                                    message: '登录尝试次数过多，请稍后再试 (15分钟内最多5次)',
                                },
                                request,
                                { status: 429 } // 429 Too Many Requests
                            );
                        }

                        const loginData = (await validateRequestBody(request)) as LoginInput;

                        // 验证登录数据
                        const validation = validateLogin(loginData);
                        if (!validation.valid) {
                            return createJsonResponse(
                                {
                                    success: false,
                                    message: `验证失败: ${validation.errors?.join(", ")}`,
                                },
                                request,
                                { status: 400 }
                            );
                        }

                    const result = await api.login(loginData as LoginRequest);

                    // 如果登录成功，设置 HttpOnly Cookie
                    if (result.success && result.token) {
                        const maxAge = loginData.rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;

                        return createJsonResponse(
                            { success: true, message: result.message },
                            request,
                            {
                                headers: {
                                    'Set-Cookie': [
                                        `auth_token=${result.token}`,
                                        'HttpOnly',
                                        'Secure',
                                        'SameSite=Strict',
                                        `Max-Age=${maxAge}`,
                                        'Path=/',
                                    ].join('; '),
                                },
                            }
                        );
                    }

                    return createJsonResponse(result, request);
                    } catch (error) {
                        return createJsonResponse(
                            {
                                success: false,
                                message: error instanceof Error ? error.message : '请求无效',
                            },
                            request,
                            { status: 400 }
                        );
                    }
                }

                // 登出路由
                if (path === "logout" && method === "POST") {
                    return createJsonResponse(
                        { success: true, message: '登出成功' },
                        request,
                        {
                            headers: {
                                'Set-Cookie': [
                                    'auth_token=',
                                    'HttpOnly',
                                    'Secure',
                                    'SameSite=Strict',
                                    'Max-Age=0',
                                    'Path=/',
                                ].join('; '),
                            },
                        }
                    );
                }

                // 认证状态检查端点 - 检查当前用户是否已认证
                if (path === "auth/status" && method === "GET") {
                    // 检查 Cookie 中的 token
                    const cookieHeader = request.headers.get("Cookie");
                    let token: string | null = null;

                    if (cookieHeader) {
                        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
                            const [key, value] = cookie.trim().split('=');
                            if (key && value) {
                                acc[key] = value;
                            }
                            return acc;
                        }, {} as Record<string, string>);

                        token = cookies['auth_token'] || null;
                    }

                    // 验证 token
                    if (token && api.isAuthEnabled()) {
                        try {
                            const result = await api.verifyToken(token);
                            return createJsonResponse(
                                { authenticated: result.valid },
                                request
                            );
                        } catch {
                            return createJsonResponse(
                                { authenticated: false },
                                request
                            );
                        }
                    }

                    // 没有 token 或认证未启用
                    return createJsonResponse(
                        { authenticated: false },
                        request
                    );
                }

                // 认证启用状态检查端点
                if (path === "auth/enabled" && method === "GET") {
                    return createJsonResponse(
                        { enabled: api.isAuthEnabled() },
                        request
                    );
                }

                // 初始化数据库接口 - 不需要验证
                if (path === "init" && method === "GET") {
                    const initResult = await api.initDB();
                    if (initResult.alreadyInitialized) {
                        return createResponse("数据库已经初始化过，无需重复初始化", request, { status: 200 });
                    }
                    return createResponse("数据库初始化成功", request, { status: 200 });
                }

                // 图标代理路由 - 通过 CF 边缘缓存加速远程 favicon（公开只读，无需认证）
                // 结合 Cloudflare 特性：所有站点图标统一由 CF 边缘 CDN 分发，二次访问零回源，
                // 显著降低图标加载延迟与浏览器并发请求压力（配合前端 loading="lazy" 使用）
                if (path === "icon" && method === "GET") {
                    const target = url.searchParams.get("url");
                    if (!target) {
                        return createResponse("缺少 url 参数", request, { status: 400 });
                    }

                    // 防 SSRF：只允许公网 http/https，拒绝本地/内网/保留地址
                    let parsedTarget: URL;
                    try {
                        parsedTarget = new URL(target);
                    } catch {
                        return createResponse("无效的图标 URL", request, { status: 400 });
                    }

                    if (!["http:", "https:"].includes(parsedTarget.protocol)) {
                        return createResponse("不支持的协议", request, { status: 400 });
                    }

                    if (isBlockedHost(parsedTarget.hostname)) {
                        return createResponse("禁止访问的地址", request, { status: 403 });
                    }

                    // 使用 CF Workers 运行时提供的默认缓存（默认缓存即边缘缓存）
                    // 注：tsconfig 的 WebWorker lib 与 workers-types 合并后 CacheStorage 无 default 类型，
                    // 运行时实际可用，故显式断言
                    const cache = (caches as unknown as { default: Cache }).default;
                    const cacheKey = new Request(
                        `https://${url.host}/api/icon?url=${encodeURIComponent(target)}`,
                        { method: "GET" }
                    );

                    // 1. 尝试命中 CF 边缘缓存
                    const cached = await cache.match(cacheKey);
                    if (cached) {
                        return cached;
                    }

                    // 2. 回源拉取（5s 超时，伪装浏览器 UA）
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 5000);

                        const upstream = await fetch(target, {
                            method: "GET",
                            signal: controller.signal,
                            headers: {
                                "User-Agent":
                                    "Mozilla/5.0 (compatible; Navihive/1.0; +https://navihive.dev)",
                                Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                            },
                        });
                        clearTimeout(timeoutId);

                        if (!upstream.ok) {
                            return createResponse("图标获取失败", request, { status: 404 });
                        }

                        const contentType = ((upstream.headers.get("Content-Type") || "").split(";")[0] ?? "").trim();
                        if (!contentType.startsWith("image/")) {
                            return createResponse("非图片内容", request, { status: 415 });
                        }

                        // 限制体积，favicon 正常远小于 512KB
                        const body = await upstream.arrayBuffer();
                        if (body.byteLength > 512 * 1024) {
                            return createResponse("图标过大", request, { status: 413 });
                        }

                        const response = new Response(body, {
                            status: 200,
                            headers: {
                                "Content-Type": contentType || "image/png",
                                "Cache-Control": "public, max-age=86400, s-maxage=604800",
                                "Access-Control-Allow-Origin": "*",
                            },
                        });

                        // 3. 写入 CF 边缘缓存（TTL 由上面 Cache-Control 的 s-maxage=604800 控制，即 7 天）
                        await cache.put(cacheKey, response.clone());

                        return response;
                    } catch {
                        return createResponse("图标获取失败", request, { status: 404 });
                    }
                }

                // 验证中间件 - 条件认证
                let isAuthenticated = false; // 记录认证状态

                if (api.isAuthEnabled()) {
                    const requestPath = `/api/${path}`;

                    // 检查是否为只读路由且免认证已启用
                    const isReadOnlyRoute = READ_ONLY_ROUTES.some(
                        (route) => route.method === method && route.path === requestPath
                    );

                    // AI 对话路由：密钥由站长统一配置并经服务端代理调用，访客可免登录使用
                    // （当 AUTH_REQUIRED_FOR_READ=true 时整体进入私密模式，访客同样被禁止）
                    const isPublicAIRoute = method === "POST" && requestPath === "/api/ai/chat";

                    const shouldRequireAuth =
                        (!isReadOnlyRoute && !isPublicAIRoute) ||
                        env.AUTH_REQUIRED_FOR_READ === 'true';

                    // 总是检查 token（如果存在）
                    const cookieHeader = request.headers.get("Cookie");
                    let token: string | null = null;

                    if (cookieHeader) {
                        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
                            const [key, value] = cookie.trim().split('=');
                            if (key) {
                                acc[key] = value || '';
                            }
                            return acc;
                        }, {} as Record<string, string>);

                        token = cookies['auth_token'] || null;
                    }

                    // 如果 Cookie 中没有，尝试从 Authorization 头读取（向后兼容）
                    if (!token) {
                        const authHeader = request.headers.get("Authorization");
                        if (authHeader) {
                            const [authType, headerToken] = authHeader.split(" ");
                            if (authType === "Bearer" && headerToken) {
                                token = headerToken;
                            }
                        }
                    }

                    // 如果有 token，验证它
                    if (token) {
                        try {
                            const verifyResult = await api.verifyToken(token);
                            if (verifyResult.valid) {
                                isAuthenticated = true; // 认证成功
                                log({
                                    timestamp: new Date().toISOString(),
                                    level: 'info',
                                    message: `已认证用户访问: ${method} ${requestPath}`,
                                });
                            }
                        } catch (error) {
                            // Token 验证失败，保持 isAuthenticated = false
                            log({
                                timestamp: new Date().toISOString(),
                                level: 'warn',
                                message: `Token 验证失败: ${method} ${requestPath}`,
                                details: error,
                            });
                        }
                    }

                    // 如果需要强制认证但未认证，返回 401
                    if (shouldRequireAuth && !isAuthenticated) {
                        return createResponse("请先登录", request, {
                            status: 401,
                            headers: {
                                "WWW-Authenticate": "Bearer",
                            },
                        });
                    }

                    // 记录访客访问（只读路由且未认证）
                    if (isReadOnlyRoute && !isAuthenticated) {
                        log({
                            timestamp: new Date().toISOString(),
                            level: 'info',
                            message: `访客模式访问: ${method} ${requestPath}`,
                        });
                    }
                }

                // 路由匹配
                // GET /api/groups-with-sites 获取所有分组及其站点 (优化 N+1 查询)
                if (path === "groups-with-sites" && method === "GET") {
                    const groupsWithSites = await api.getGroupsWithSites();

                    // 根据认证状态过滤数据
                    if (!isAuthenticated) {
                        // 未认证用户只能看到公开分组下的公开站点
                        // 使用 !== 0 判断，兼容 NULL 值（NULL 视为公开）
                        const filteredGroups = groupsWithSites
                            .filter(group => group.is_public !== 0)
                            .map(group => ({
                                ...group,
                                sites: group.sites.filter(site => site.is_public !== 0)
                            }));
                        return createJsonResponse(filteredGroups, request, { headers: readCacheHeaders(isAuthenticated) });
                    }

                    return createJsonResponse(groupsWithSites, request, { headers: readCacheHeaders(isAuthenticated) });
                }
                // GET /api/groups 获取所有分组
                else if (path === "groups" && method === "GET") {
                    // 根据认证状态过滤查询
                    let query = 'SELECT * FROM groups';
                    const params: number[] = [];

                    if (!isAuthenticated) {
                        // 未认证用户只能看到公开分组（NULL 视为公开）
                        query += ' WHERE is_public IS NOT 0';
                    }

                    query += ' ORDER BY order_num ASC';

                    const result = await env.DB.prepare(query).bind(...params).all();
                    return createJsonResponse(result.results || [], request, { headers: readCacheHeaders(isAuthenticated) });
                } else if (path.startsWith("groups/") && method === "GET") {
                    const idStr = path.split("/")[1];
                    if (!idStr) {
                        return createJsonResponse({ error: "无效的ID" }, request, { status: 400 });
                    }
                    const id = parseInt(idStr);
                    if (isNaN(id)) {
                        return createJsonResponse({ error: "无效的ID" }, request, { status: 400 });
                    }
                    const group = await api.getGroup(id);
                    return createJsonResponse(group, request);
                } else if (path === "groups" && method === "POST") {
                    const data = (await validateRequestBody(request)) as GroupInput;

                    // 验证分组数据
                    const validation = validateGroup(data);
                    if (!validation.valid) {
                        return createJsonResponse(
                            {
                                success: false,
                                message: `验证失败: ${validation.errors?.join(", ")}`,
                            },
                            request,
                            { status: 400 }
                        );
                    }

                    const result = await api.createGroup(validation.sanitizedData as Group);
                    return createJsonResponse(result, request);
                } else if (path.startsWith("groups/") && method === "PUT") {
                    const idStr = path.split("/")[1];
                    if (!idStr) {
                        return createJsonResponse({ error: "无效的ID" }, request, { status: 400 });
                    }
                    const id = parseInt(idStr);
                    if (isNaN(id)) {
                        return createJsonResponse({ error: "无效的ID" }, request, { status: 400 });
                    }

                    const data = (await validateRequestBody(request)) as Partial<Group>;
                    // 对修改的字段进行验证
                    if (
                        data.name !== undefined &&
                        (typeof data.name !== "string" || data.name.trim() === "")
                    ) {
                        return createJsonResponse(
                            {
                                success: false,
                                message: "分组名称不能为空且必须是字符串",
                            },
                            request,
                            { status: 400 }
                        );
                    }

                    if (data.order_num !== undefined && typeof data.order_num !== "number") {
                        return createJsonResponse(
                            {
                                success: false,
                                message: "排序号必须是数字",
                            },
                            request,
                            { status: 400 }
                        );
                    }

                    if (
                        data.is_public !== undefined &&
                        (typeof data.is_public !== "number" ||
                            (data.is_public !== 0 && data.is_public !== 1))
                    ) {
                        return createJsonResponse(
                            {
                                success: false,
                                message: "is_public 必须是 0 (私密) 或 1 (公开)",
                            },
                            request,
                            { status: 400 }
                        );
                    }

                    const result = await api.updateGroup(id, data);
                    return createJsonResponse(result, request);
                } else if (path.startsWith("groups/") && method === "DELETE") {
                    const idStr = path.split("/")[1];
                    if (!idStr) {
                        return createJsonResponse({ error: "无效的ID" }, request, { status: 400 });
                    }
                    const id = parseInt(idStr);
                    if (isNaN(id)) {
                        return createJsonResponse({ error: "无效的ID" }, request, { status: 400 });
                    }

                    const result = await api.deleteGroup(id);
                    return createJsonResponse({ success: result }, request);
                }
                // ========== 站点相关API（特异性路由必须放在通用路由之前） ==========

                // 1. 批量移动站点到其他分组 (PUT sites/batch-move)
                else if (path === "sites/batch-move" && method === "PUT") {
                    const data = await validateRequestBody(request) as {
                        site_ids: number[];
                        target_group_id: number;
                    };

                    if (!data.site_ids || !Array.isArray(data.site_ids) || data.site_ids.length === 0) {
                        return createJsonResponse(
                            { success: false, message: '请提供要移动的站点ID列表' },
                            request,
                            { status: 400 }
                        );
                    }

                    if (!data.target_group_id) {
                        return createJsonResponse(
                            { success: false, message: '请提供目标分组ID' },
                            request,
                            { status: 400 }
                        );
                    }

                    // 批量更新站点分组
                    const results = await api.batchMoveSites(data.site_ids, data.target_group_id);
                    
                    return createJsonResponse({ success: true, moved: results }, request);
                }

                // 2. 移动单个站点到其他分组 - 跨组拖拽 (PUT sites/:id/move)
                else if (path.startsWith("sites/") && path.endsWith("/move") && method === "PUT") {
                    const parts = path.split("/");
                    const siteIdStr = parts[1];
                    if (!siteIdStr) {
                        return createJsonResponse({ error: "无效的站点ID" }, request, { status: 400 });
                    }
                    const siteId = parseInt(siteIdStr);
                    if (isNaN(siteId)) {
                        return createJsonResponse({ error: "无效的站点ID" }, request, { status: 400 });
                    }

                    const data = await validateRequestBody(request) as { target_group_id: number };
                    if (!data.target_group_id) {
                        return createJsonResponse(
                            { success: false, message: '请提供目标分组ID' },
                            request,
                            { status: 400 }
                        );
                    }

                    const result = await api.updateSite(siteId, { group_id: data.target_group_id });
                    return createJsonResponse({ success: !!result, site: result }, request);
                }

                // 3. 获取所有站点 (GET sites)
                else if (path === "sites" && method === "GET") {
                    // 根据认证状态过滤查询
                    let query = `
                        SELECT s.*
                        FROM sites s
                        INNER JOIN groups g ON s.group_id = g.id
                    `;

                    const groupId = url.searchParams.get("groupId");
                    const conditions: string[] = [];
                    const params: (string | number)[] = [];

                    // 添加 groupId 过滤条件
                    if (groupId) {
                        conditions.push(`s.group_id = ?`);
                        params.push(parseInt(groupId));
                    }

                    // 未认证用户只能看到公开分组下的公开网站（NULL 视为公开）
                    if (!isAuthenticated) {
                        conditions.push('g.is_public IS NOT 0');
                        conditions.push('s.is_public IS NOT 0');
                    }

                    if (conditions.length > 0) {
                        query += ' WHERE ' + conditions.join(' AND ');
                    }

                    query += ' ORDER BY s.group_id ASC, s.order_num ASC';

                    const result = await env.DB.prepare(query).bind(...params).all();
                    return createJsonResponse(result.results || [], request, { headers: readCacheHeaders(isAuthenticated) });
                }

                // 4. 获取单个站点 (GET sites/:id)
                else if (path.startsWith("sites/") && method === "GET") {
                    const idStr = path.split("/")[1];
                    if (!idStr) {
                        return createJsonResponse({ error: "无效的ID" }, request, { status: 400 });
                    }
                    const id = parseInt(idStr);
                    if (isNaN(id)) {
                        return createJsonResponse({ error: "无效的ID" }, request, { status: 400 });
                    }

                    const site = await api.getSite(id);
                    return createJsonResponse(site, request);
                }

                // 5. 新建站点 (POST sites)
                else if (path === "sites" && method === "POST") {
                    const data = (await validateRequestBody(request)) as SiteInput;

                    // 验证站点数据
                    const validation = validateSite(data);
                    if (!validation.valid) {
                        return createJsonResponse(
                            {
                                success: false,
                                message: `验证失败: ${validation.errors?.join(", ")}`,
                            },
                            request,
                            { status: 400 }
                        );
                    }

                    const result = await api.createSite(validation.sanitizedData as Site);
                    return createJsonResponse(result, request);
                }

                // 6. 更新单个站点 (PUT sites/:id)
                else if (path.startsWith("sites/") && method === "PUT") {
                    const idStr = path.split("/")[1];
                    if (!idStr) {
                        return createJsonResponse({ error: "无效的ID" }, request, { status: 400 });
                    }
                    const id = parseInt(idStr);
                    if (isNaN(id)) {
                        return createJsonResponse({ error: "无效的ID" }, request, { status: 400 });
                    }

                    const data = (await validateRequestBody(request)) as Partial<Site>;

                    // 验证更新的站点数据
                    if (data.url !== undefined) {
                        let url = data.url.trim();
                        // 如果没有协议,自动添加 https://
                        if (!/^https?:\/\//i.test(url)) {
                            url = 'https://' + url;
                        }
                        try {
                            new URL(url);
                            data.url = url; // 使用修正后的URL
                        } catch {
                            return createJsonResponse(
                                {
                                    success: false,
                                    message: "无效的URL格式",
                                },
                                request,
                                { status: 400 }
                            );
                        }
                    }

                    if (data.icon !== undefined && data.icon !== "") {
                        let iconUrl = data.icon.trim();
                        // 如果没有协议,自动添加 https://
                        if (!/^https?:\/\//i.test(iconUrl) && !/^data:/i.test(iconUrl)) {
                            iconUrl = 'https://' + iconUrl;
                        }
                        try {
                            new URL(iconUrl);
                            data.icon = iconUrl; // 使用修正后的URL
                        } catch {
                            return createJsonResponse(
                                {
                                    success: false,
                                    message: "无效的图标URL格式",
                                },
                                request,
                                { status: 400 }
                            );
                        }
                    }

                    if (
                        data.is_public !== undefined &&
                        (typeof data.is_public !== "number" ||
                            (data.is_public !== 0 && data.is_public !== 1))
                    ) {
                        return createJsonResponse(
                            {
                                success: false,
                                message: "is_public 必须是 0 (私密) 或 1 (公开)",
                            },
                            request,
                            { status: 400 }
                        );
                    }

                    const result = await api.updateSite(id, data);
                    return createJsonResponse(result, request);
                }

                // 7. 删除单个站点 (DELETE sites/:id)
                else if (path.startsWith("sites/") && method === "DELETE") {
                    const idStr = path.split("/")[1];
                    if (!idStr) {
                        return createJsonResponse({ error: "无效的ID" }, request, { status: 400 });
                    }
                    const id = parseInt(idStr);
                    if (isNaN(id)) {
                        return createJsonResponse({ error: "无效的ID" }, request, { status: 400 });
                    }

                    const result = await api.deleteSite(id);
                    return createJsonResponse({ success: result }, request);
                }
                // 批量更新排序
                else if (path === "group-orders" && method === "PUT") {
                    const data = (await validateRequestBody(request)) as Array<{ id: number; order_num: number }>;

                    // 验证排序数据
                    if (!Array.isArray(data)) {
                        return createJsonResponse(
                            {
                                success: false,
                                message: "排序数据必须是数组",
                            },
                            request,
                            { status: 400 }
                        );
                    }

                    for (const item of data) {
                        if (
                            !item.id ||
                            typeof item.id !== "number" ||
                            item.order_num === undefined ||
                            typeof item.order_num !== "number"
                        ) {
                            return createJsonResponse(
                                {
                                    success: false,
                                    message: "排序数据格式无效，每个项目必须包含id和order_num",
                                },
                                request,
                                { status: 400 }
                            );
                        }
                    }

                    const result = await api.updateGroupOrder(data);
                    return createJsonResponse({ success: result }, request);
                } 
                else if (path === "site-orders" && method === "PUT") {
                    const data = (await validateRequestBody(request)) as Array<{ id: number; order_num: number }>;

                    // 验证排序数据
                    if (!Array.isArray(data)) {
                        return createJsonResponse(
                            {
                                success: false,
                                message: "排序数据必须是数组",
                            },
                            request,
                            { status: 400 }
                        );
                    }

                    for (const item of data) {
                        if (
                            !item.id ||
                            typeof item.id !== "number" ||
                            item.order_num === undefined ||
                            typeof item.order_num !== "number"
                        ) {
                            return createJsonResponse(
                                {
                                    success: false,
                                    message: "排序数据格式无效，每个项目必须包含id和order_num",
                                },
                                request,
                                { status: 400 }
                            );
                        }
                    }

                    const result = await api.updateSiteOrder(data);
                    return createJsonResponse({ success: result }, request);
                }
                    
                // 配置相关API
                else if (path === "configs" && method === "GET") {
                    const configs = await api.getConfigs();
                    return createJsonResponse(configs, request, { headers: readCacheHeaders(isAuthenticated) });
                } else if (path.startsWith("configs/") && method === "GET") {
                    const key = path.substring("configs/".length);
                    const value = await api.getConfig(key);
                    return createJsonResponse({ key, value }, request, { headers: readCacheHeaders(isAuthenticated) });
                } else if (path.startsWith("configs/") && method === "PUT") {
                    const key = path.substring("configs/".length);
                    const data = (await validateRequestBody(request)) as ConfigInput;

                    // 验证配置数据
                    const validation = validateConfig(data);
                    if (!validation.valid) {
                        return createJsonResponse(
                            {
                                success: false,
                                message: `验证失败: ${validation.errors?.join(", ")}`,
                            },
                            request,
                            { status: 400 }
                        );
                    }

                    // 确保value存在
                    if (data.value === undefined) {
                        return createJsonResponse(
                            {
                                success: false,
                                message: "配置值必须提供，可以为空字符串",
                            },
                            request,
                            { status: 400 }
                        );
                    }

                    const result = await api.setConfig(key, data.value);
                    return createJsonResponse({ success: result }, request);
                } else if (path.startsWith("configs/") && method === "DELETE") {
                    const key = path.substring("configs/".length);
                    const result = await api.deleteConfig(key);
                    return createJsonResponse({ success: result }, request);
                }

                // 数据导出路由
                else if (path === "export" && method === "GET") {
                    const data = await api.exportData();
                    return createJsonResponse(data, request, {
                        headers: {
                            "Content-Disposition": "attachment; filename=navhive-data.json",
                            "Content-Type": "application/json",
                        },
                    });
                }

                // 数据导入路由
                else if (path === "import" && method === "POST") {
                    const data = await validateRequestBody(request);

                    // 深度验证导入数据
                    const validation = validateExportData(data);
                    if (!validation.valid) {
                        return createJsonResponse(
                            {
                                success: false,
                                message: '导入数据验证失败',
                                errors: validation.errors,
                            },
                            request,
                            { status: 400 }
                        );
                    }

                    const result = await api.importData(data as ExportData);
                    return createJsonResponse(result, request);
                }

                // ========== AI 辅助 API ==========

                // 获取 AI 设置（密钥明文与密文均不下发，仅返回是否已配置 + 掩码）
                else if (path === "ai/settings" && method === "GET") {
                    const [enabled, baseUrl, model, systemPrompt, storedKey, rawModels, rawToolsEnabled, rawTokenBudget, rawExtEnabled] =
                        await Promise.all([
                            api.getConfig("ai.enabled"),
                            api.getConfig("ai.baseUrl"),
                            api.getConfig("ai.model"),
                            api.getConfig("ai.systemPrompt"),
                            api.getConfig("ai.apiKey"),
                            api.getConfig("ai.models"),
                            api.getConfig("ai.toolsEnabled"),
                            api.getConfig("ai.tokenBudget"),
                            api.getConfig("ai.extSkillsEnabled"),
                        ]);

                    // 解析多模型列表（config 中以 JSON 数组字符串存储）
                    let models: string[] = [];
                    try {
                        const parsed = JSON.parse(rawModels || "[]");
                        if (Array.isArray(parsed)) {
                            models = parsed
                                .filter((m): m is string => typeof m === "string")
                                .map((m) => m.trim())
                                .filter((m) => m.length > 0);
                        }
                    } catch {
                        models = [];
                    }
                    const defaultModel = (model || "").trim();
                    if (models.length === 0 && defaultModel) {
                        models = [defaultModel];
                    }

                    // 掩码：仅展示末尾 4 位，用于确认已保存过密钥，不泄露明文
                    let maskedKey = "";
                    if (storedKey) {
                        const decrypted = await decryptAISecret(storedKey, env);
                        maskedKey = decrypted
                            ? (decrypted.length > 4 ? `****${decrypted.slice(-4)}` : "****")
                            : "****";
                    }

                    return createJsonResponse(
                        {
                            enabled: enabled === "true",
                            baseUrl: baseUrl || "",
                            model: defaultModel || (models[0] || ""),
                            models,
                            systemPrompt: systemPrompt || "",
                            toolsEnabled: rawToolsEnabled !== "false",
                            tokenBudget: parseTokenBudget(rawTokenBudget),
                            extSkillsEnabled: rawExtEnabled !== "false",
                            hasKey: Boolean(storedKey),
                            maskedKey,
                        },
                        request
                    );
                }

                // 保存 AI 设置（密钥非空时在服务端加密后入库；留空表示保持已有密钥不变）
                else if (path === "ai/settings" && method === "PUT") {
                    const data = (await validateRequestBody(request)) as AiSettingsInput;

                    const errors = validateAISettings(data);
                    if (errors.length > 0) {
                        return createJsonResponse(
                            { success: false, message: `验证失败: ${errors.join("; ")}` },
                            request,
                            { status: 400 }
                        );
                    }

                    if (data.enabled !== undefined) {
                        await api.setConfig("ai.enabled", data.enabled ? "true" : "false");
                    }
                    if (data.baseUrl !== undefined) {
                        await api.setConfig("ai.baseUrl", data.baseUrl.trim());
                    }
                    // 模型列表整体覆盖：规范化（去空白 / 去空 / 去重，最多 20 个）
                    // 未显式传默认模型时，列表第一个作为 ai.model（默认模型）
                    if (data.models !== undefined && Array.isArray(data.models)) {
                        const seen = new Set<string>();
                        const next: string[] = [];
                        for (const raw of data.models) {
                            const m = typeof raw === "string" ? raw.trim() : "";
                            if (m && !seen.has(m) && next.length < 20) {
                                seen.add(m);
                                next.push(m);
                            }
                        }
                        await api.setConfig("ai.models", JSON.stringify(next));
                        if (data.model === undefined) {
                            await api.setConfig("ai.model", next[0] || "");
                        }
                    }
                    if (data.model !== undefined) {
                        await api.setConfig("ai.model", data.model.trim());
                        // 兼容旧数据：仅传单模型时自动初始化模型列表
                        if (data.models === undefined) {
                            const raw = await api.getConfig("ai.models");
                            let existing: unknown = null;
                            try {
                                existing = raw ? JSON.parse(raw) : null;
                            } catch {
                                existing = null;
                            }
                            const isEmpty =
                                !Array.isArray(existing) || (existing as unknown[]).length === 0;
                            if (isEmpty) {
                                await api.setConfig(
                                    "ai.models",
                                    JSON.stringify([data.model.trim()])
                                );
                            }
                        }
                    }
                    if (data.systemPrompt !== undefined) {
                        await api.setConfig(
                            "ai.systemPrompt",
                            data.systemPrompt.trimStart()
                        );
                    }
                    if (data.apiKey !== undefined && data.apiKey.trim() !== "") {
                        const encrypted = await encryptAISecret(data.apiKey.trim(), env);
                        if (!encrypted) {
                            return createJsonResponse(
                                {
                                    success: false,
                                    message:
                                        "未配置 AI_SECRET / AUTH_SECRET，无法安全加密 API 密钥，请先在 Wrangler 环境中配置后重试",
                                },
                                request,
                                { status: 500 }
                            );
                        }
                        await api.setConfig("ai.apiKey", encrypted);
                    }
                    if (data.toolsEnabled !== undefined) {
                        await api.setConfig(
                            "ai.toolsEnabled",
                            data.toolsEnabled ? "true" : "false"
                        );
                    }
                    if (data.tokenBudget !== undefined && Number.isFinite(data.tokenBudget)) {
                        const budget = Math.max(0, Math.min(8000, Math.round(data.tokenBudget)));
                        await api.setConfig("ai.tokenBudget", String(budget));
                    }
                    if (data.extSkillsEnabled !== undefined) {
                        await api.setConfig(
                            "ai.extSkillsEnabled",
                            data.extSkillsEnabled ? "true" : "false"
                        );
                    }

                    return createJsonResponse(
                        { success: true, message: "AI 设置已保存" },
                        request
                    );
                }

                // AI 对话代理：服务端解密密钥并转发到 OpenAI 兼容接口（密钥不经过浏览器）
                else if (path === "ai/chat" && method === "POST") {
                    // 开关检查
                    if ((await api.getConfig("ai.enabled")) !== "true") {
                        return createJsonResponse(
                            { success: false, message: "AI 辅助功能未开启" },
                            request,
                            { status: 403 }
                        );
                    }

                    // 按 IP 限流，防止共享密钥被滥用
                    const clientIP =
                        request.headers.get("CF-Connecting-IP") ||
                        request.headers.get("X-Forwarded-For") ||
                        "unknown";
                    if (!aiChatRateLimiter.check(clientIP)) {
                        return createJsonResponse(
                            { success: false, message: "请求过于频繁，请稍后再试" },
                            request,
                            { status: 429 }
                        );
                    }

                    const data = (await validateRequestBody(request)) as {
                        messages?: { role?: string; content?: string }[];
                        model?: string;
                    };
                    if (
                        !Array.isArray(data.messages) ||
                        data.messages.length === 0 ||
                        data.messages.length > 50
                    ) {
                        return createJsonResponse(
                            { success: false, message: "消息内容不能为空且单次最多 50 条" },
                            request,
                            { status: 400 }
                        );
                    }

                    const [baseUrl, model, storedKey, customPrompt, rawModels, rawToolsEnabled, rawTokenBudget, rawExtEnabled] =
                        await Promise.all([
                            api.getConfig("ai.baseUrl"),
                            api.getConfig("ai.model"),
                            api.getConfig("ai.apiKey"),
                            api.getConfig("ai.systemPrompt"),
                            api.getConfig("ai.models"),
                            api.getConfig("ai.toolsEnabled"),
                            api.getConfig("ai.tokenBudget"),
                            api.getConfig("ai.extSkillsEnabled"),
                        ]);

                    const trimmedBaseUrl = (baseUrl || "").trim();
                    const defaultModel = (model || "").trim();
                    // AI 技能总开关（默认开启）、扩展技能开关（学术/建议/教学）与上下文 Token 预算
                    const toolsEnabled = rawToolsEnabled !== "false";
                    const extSkillsEnabled = rawExtEnabled !== "false";
                    const tokenBudget = parseTokenBudget(rawTokenBudget);

                    // 解析管理员配置的模型白名单（ai.models JSON 数组）
                    let configuredModels: string[] = [];
                    try {
                        const parsed = JSON.parse(rawModels || "[]");
                        if (Array.isArray(parsed)) {
                            configuredModels = parsed
                                .filter((m): m is string => typeof m === "string")
                                .map((m) => m.trim())
                                .filter((m) => m.length > 0);
                        }
                    } catch {
                        configuredModels = [];
                    }
                    const allowedModels = new Set<string>(
                        configuredModels.length > 0
                            ? configuredModels
                            : defaultModel
                              ? [defaultModel]
                              : []
                    );
                    if (defaultModel) allowedModels.add(defaultModel);

                    // 会话可选指定模型；仅在管理员配置的白名单内才允许，防止密钥与模型被任意探测
                    const requestedModel =
                        typeof data.model === "string" ? data.model.trim() : "";
                    if (requestedModel && !allowedModels.has(requestedModel)) {
                        return createJsonResponse(
                            {
                                success: false,
                                message: "请求的模型未被管理员配置，请在对话中选择可用的模型",
                            },
                            request,
                            { status: 400 }
                        );
                    }
                    const trimmedModel = requestedModel || defaultModel;

                    if (!trimmedBaseUrl || !trimmedModel || !storedKey) {
                        return createJsonResponse(
                            {
                                success: false,
                                message:
                                    "AI 尚未配置完成，请管理员在设置中填写 Base URL、模型与 API 密钥",
                            },
                            request,
                            { status: 400 }
                        );
                    }

                    const secretKey = await decryptAISecret(storedKey, env);
                    if (!secretKey) {
                        return createJsonResponse(
                            {
                                success: false,
                                message:
                                    "API 密钥解密失败（可能 AI_SECRET 已变更），请管理员重新保存密钥",
                            },
                            request,
                            { status: 500 }
                        );
                    }

                    // 组装 OpenAI 兼容请求：系统提示词 + 基于 Token 预算的历史窗口
                    //  ① 单条最长 8000 字符、最多取最近 20 条
                    //  ② Token 预算：tokenBudget 为 0 时不限制；大于 0 时 estimateTokens 估算
                    //     超限则从最旧处截断（节省 token）
                    //  ③ 系统提示词恒定放在最前（利于上游 prompt caching），动态内容追加在其后
                    const filtered = data.messages
                        .filter(
                            (m) =>
                                m &&
                                (m.role === "user" || m.role === "assistant") &&
                                typeof m?.content === "string" &&
                                (m.content as string).length <= 8000
                        )
                        .slice(-20)
                        .map((m) => ({
                            role: (m?.role as "user" | "assistant") || "user",
                            content: (m?.content as string) || "",
                        }));
                    if (filtered.length === 0) {
                        return createJsonResponse(
                            { success: false, message: "消息内容不能为空" },
                            request,
                            { status: 400 }
                        );
                    }
                    const systemContent = customPrompt || DEFAULT_AI_SYSTEM_PROMPT;
                    const historyTrim = trimHistoryWithinBudget(
                        filtered,
                        tokenBudget,
                        systemContent
                    );
                    let systemPromptFinal = systemContent;
                    if (historyTrim.dropped > 0) {
                        systemPromptFinal += `\n\n（提示：为节省上下文占用，更早的 ${historyTrim.dropped} 条对话已被截断；如用户提及更早内容，请如实说明无法查看。）`;
                    }
                    let messagesForLLM: ChatMessage[] = [
                        { role: "system", content: systemPromptFinal },
                        ...historyTrim.history,
                    ];

                    // 极简「寒暄/闲聊」识别：这类消息直接由模型单轮作答，跳过技能（函数调用）环路，
                    // 省掉 1~2 次上游往返，显著降低简单问题的响应时延。
                    const latestUserChat = [...filtered]
                        .reverse()
                        .find((m) => m.role === "user");
                    const skipSkillOneShot =
                        toolsEnabled &&
                        !!latestUserChat &&
                        isSimpleChatMessage(latestUserChat.content);

                    const endpoint = trimmedBaseUrl.replace(/\/+$/, "") + "/chat/completions";

                    // ============ SSE 流式返回：逐 token 下发 + 技能（函数调用）服务端编排 ============
                    // 处理角度（三个关键转变，完全兼容现有 skills）：
                    //  ① stream:true——首 token 到达即开始向下推送，长回答不再"憋到全部生成完"；
                    //  ② 空闲超时替代固定总超时——每收到一个 chunk 重置计时器，慢但仍在出字的模型
                    //     永不超时，只有真正卡死（30s 无数据）才中止并立刻回传 error 事件，杜绝"不响应"；
                    //  ③ delta.tool_calls 增量拼装→executeAISkill 并行执行→tool 结果回传下一轮，
                    //     技能定义、执行与"上游不支持函数=降级注入"逻辑全部复用，零改动。
                    try {
                        const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
                        const writer = writable.getWriter();
                        const encoder = new TextEncoder();
                        // 统一 SSE 事件出口：meta / skill / delta / done / error，客户端按事件分流渲染
                        const send = async (event: string, data: unknown) => {
                            try {
                                await writer.write(
                                    encoder.encode(`event:${event}\ndata:${JSON.stringify(data)}\n\n`)
                                );
                            } catch {
                                /* 客户端已断开，忽略写入失败 */
                            }
                        };

                        const controller = new AbortController();
                        const onClientAbort = () => controller.abort();
                        request.signal.addEventListener("abort", onClientAbort, { once: true });

                        const MAX_TOOL_ROUNDS = 2;
                        let toolsActive = toolsEnabled;
                        const usedSkills: string[] = [];

                        // 执行本轮技能调用并回传结果；向客户端上抛 skill 事件（前端据此显示"已查寻"徽标）
                        const runToolCalls = async (
                            toolCalls: {
                                id: string;
                                type: string;
                                function: { name: string; arguments: string };
                            }[],
                            round: number
                        ) => {
                            messagesForLLM.push({
                                role: "assistant",
                                content: "",
                                tool_calls: toolCalls.map((tc, idx) => ({
                                    id: tc.id || `call_${round}_${idx}`,
                                    type: "function",
                                    function: {
                                        name: tc.function.name || "",
                                        arguments: tc.function.arguments || "",
                                    },
                                })),
                            });
                            // 并行执行多个技能（互不依赖），整体耗时取最大值；结果按下标顺序回传
                            const toolOutcomes = await Promise.all(
                                toolCalls.map(async (tc, idx) => {
                                    const name = tc.function.name || "";
                                    let result: string;
                                    try {
                                        let args: Record<string, unknown> = {};
                                        try {
                                            const parsed = JSON.parse(
                                                tc.function.arguments || "{}"
                                            );
                                            if (parsed && typeof parsed === "object") {
                                                args = parsed as Record<string, unknown>;
                                            }
                                        } catch {
                                            args = {};
                                        }
                                        result = await executeAISkill(env, name, args);
                                        if (!usedSkills.includes(name)) usedSkills.push(name);
                                    } catch (error) {
                                        result = `技能「${name}」执行失败：${
                                            error instanceof Error ? error.message : "未知错误"
                                        }`;
                                    }
                                    log({
                                        level: "info",
                                        message: `AI 技能执行: ${name}`,
                                        path: "/api/ai/chat",
                                        method: "POST",
                                        details: (result || "").slice(0, 200),
                                    });
                                    return {
                                        toolCallId: tc.id || `call_${round}_${idx}`,
                                        name,
                                        result,
                                    };
                                })
                            );
                            for (const item of toolOutcomes) {
                                messagesForLLM.push({
                                    role: "tool",
                                    tool_call_id: item.toolCallId,
                                    content: item.result,
                                });
                            }
                            for (const name of toolOutcomes.map((o) => o.name)) {
                                await send("skill", { name });
                            }
                        };

                        // 流式主循环在后台推进，函数立刻返回 SSE 流：首字等待 ≈ 上游首 token 延迟
                        void (async () => {
                            try {
                                await send("meta", {
                                    model: trimmedModel,
                                    skillsEnabled: toolsEnabled,
                                });
                                let doneSent = false;

                                for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
                                    // 访客已点「停止」：立即退出，不再发起新一轮上游调用
                                    if (controller.signal.aborted) break;
                                    const body: ChatCompletionBody = {
                                        model: trimmedModel,
                                        messages: messagesForLLM,
                                        temperature: 0.7,
                                        stream: true,
                                    };
                                    if (toolsActive && !skipSkillOneShot) {
                                        body.tools = extSkillsEnabled
                                            ? [...AI_SKILL_TOOLS, ...EXT_AI_SKILL_TOOLS]
                                            : AI_SKILL_TOOLS;
                                        body.tool_choice = "auto";
                                    }

                                    log({
                                        level: "info",
                                        message: `AI 对话请求（第 ${round + 1} 轮${toolsActive ? (extSkillsEnabled ? "，启用基础+扩展技能" : "，启用基础技能") : "，无技能模式"}，流式）`,
                                        path: "/api/ai/chat",
                                        method: "POST",
                                        details: {
                                            model: trimmedModel,
                                            messageCount: messagesForLLM.length,
                                            skillsSkipped: skipSkillOneShot,
                                        },
                                    });

                                    const upstream = await fetchWithIdleTimeout(
                                        endpoint,
                                        {
                                            method: "POST",
                                            headers: {
                                                "Content-Type": "application/json",
                                                Authorization: `Bearer ${secretKey}`,
                                            },
                                            body: JSON.stringify(body),
                                            signal: controller.signal,
                                        },
                                        STREAM_IDLE_TIMEOUT_MS
                                    );

                                    if (!upstream.ok) {
                                        let detail = "";
                                        try {
                                            const errBody = (await upstream.json()) as {
                                                error?: { message?: string };
                                            };
                                            detail = errBody.error?.message || "";
                                        } catch {
                                            detail = (await upstream.text()).slice(0, 300);
                                        }
                                        // 兼容性：上游不支持函数调用时，自动降级为「无工具 + 站点库摘要注入」
                                        if (
                                            toolsActive &&
                                            isToolsUnsupportedError(upstream.status, detail)
                                        ) {
                                            log({
                                                level: "warn",
                                                message:
                                                    "上游接口不支持函数调用技能，已自动降级为站点库摘要模式",
                                                path: "/api/ai/chat",
                                                method: "POST",
                                                details: detail,
                                            });
                                            toolsActive = false;
                                            const latestUser = [...filtered]
                                                .reverse()
                                                .find((m) => m.role === "user");
                                            if (latestUser) {
                                                const knowledge = await buildKnowledgeContext(
                                                    env,
                                                    latestUser.content
                                                );
                                                if (knowledge) {
                                                    systemPromptFinal += knowledge;
                                                    messagesForLLM = [
                                                        { role: "system", content: systemPromptFinal },
                                                        ...historyTrim.history,
                                                    ];
                                                }
                                            }
                                            continue;
                                        }
                                        log({
                                            level: "warn",
                                            message: `AI 上游接口返回错误: ${upstream.status}`,
                                            path: "/api/ai/chat",
                                            method: "POST",
                                            details: detail,
                                        });
                                        await send("error", {
                                            message: `AI 服务返回错误（${upstream.status}）：${
                                                detail || "无详细信息"
                                            }`,
                                        });
                                        break;
                                    }

                                    // ---- 流式解析：delta.content 实时转发；delta.tool_calls 增量拼装 ----
                                    const assembledToolCalls: {
                                        id: string;
                                        type: string;
                                        function: { name: string; arguments: string };
                                    }[] = [];
                                    let streamedContent = false;

                                    // 兼容性：个别上游/网关会重写 Content-Type 或忽略 stream=true。
                                    // 非 SSE 则读取完整 JSON 一次性作为单条 delta 下发，杜绝"无响应"。
                                    const contentType =
                                        (upstream.headers.get("Content-Type") || "")
                                            .split(";")[0]
                                            ?.trim() || "";

                                    if (contentType !== "text/event-stream") {
                                        const upstreamJson = (await upstream.json()) as {
                                            choices?: {
                                                message?: {
                                                    content?: string;
                                                    tool_calls?: {
                                                        id?: string;
                                                        type?: string;
                                                        function?: {
                                                            name?: string;
                                                            arguments?: string;
                                                        };
                                                    }[];
                                                };
                                            }[];
                                        };
                                        const assistantMessage = upstreamJson.choices?.[0]?.message;
                                        const toolCalls = (assistantMessage?.tool_calls || []).filter(
                                            (tc) =>
                                                tc?.function?.name &&
                                                typeof tc.function.arguments === "string"
                                        );
                                        if (toolsActive && toolCalls.length > 0) {
                                            const normalizedCalls = toolCalls.map((tc) => ({
                                                id: tc.id || "",
                                                type: "function" as const,
                                                function: {
                                                    name: tc.function!.name!,
                                                    arguments: tc.function!.arguments!,
                                                },
                                            }));
                                            await runToolCalls(normalizedCalls, round);
                                            continue;
                                        }
                                        const reply = assistantMessage?.content?.trim() || "";
                                        if (reply) {
                                            streamedContent = true;
                                            await send("delta", { content: reply });
                                        }
                                    } else {
                                        await parseUpstreamSSE(
                                            upstream,
                                            async (delta) => {
                                                if (
                                                    typeof delta.content === "string" &&
                                                    delta.content
                                                ) {
                                                    streamedContent = true;
                                                    await send("delta", { content: delta.content });
                                                }
                                                if (Array.isArray(delta.tool_calls)) {
                                                    for (const tc of delta.tool_calls) {
                                                        const idx =
                                                            typeof tc.index === "number" ? tc.index : 0;
                                                        if (!assembledToolCalls[idx]) {
                                                            assembledToolCalls[idx] = {
                                                                id: tc.id || `call_${round}_${idx}`,
                                                                type: "function",
                                                                function: {
                                                                    name: tc.function?.name || "",
                                                                    arguments: "",
                                                                },
                                                            };
                                                        }
                                                        const slot = assembledToolCalls[idx];
                                                        if (!slot) continue;
                                                        if (tc.id) slot.id = tc.id;
                                                        if (tc.function?.name) {
                                                            slot.function.name = tc.function.name;
                                                        }
                                                        if (typeof tc.function?.arguments === "string") {
                                                            slot.function.arguments += tc.function.arguments;
                                                        }
                                                    }
                                                }
                                            },
                                            controller.signal
                                        );
                                    }

                                    // 有技能调用（流式拼装）：执行并把结果回传给模型，进入下一轮
                                    const hasToolCalls =
                                        toolsActive && assembledToolCalls.length > 0;
                                    if (hasToolCalls) {
                                        const readyCalls = assembledToolCalls.filter(
                                            (tc) => tc.function.name.length > 0
                                        );
                                        if (readyCalls.length > 0) {
                                            await runToolCalls(readyCalls, round);
                                            continue;
                                        }
                                    }
                                    // 本轮已产出正文：流式下发完毕，收尾
                                    if (streamedContent) {
                                        await send("done", {
                                            model: trimmedModel,
                                            skillsUsed: usedSkills,
                                        });
                                        doneSent = true;
                                        break;
                                    }
                                    // 本轮无产出：交给下一轮重试，最终由循环后兜底
                                }

                                if (
                                    !doneSent &&
                                    !controller.signal.aborted &&
                                    !request.signal.aborted
                                ) {
                                    await send("error", { message: "AI 未能生成有效回答，请重试" });
                                }
                            } catch (error) {
                                const abortedByClient = request.signal.aborted;
                                if (!abortedByClient) {
                                    const isAbort =
                                        error instanceof Error && error.name === "AbortError";
                                    const message = isAbort
                                        ? "AI 响应超时（长时间未收到数据），请稍后重试"
                                        : "AI 请求失败，请检查 Base URL 与网络连通性";
                                    log({
                                        level: "warn",
                                        message,
                                        path: "/api/ai/chat",
                                        method: "POST",
                                        details: error instanceof Error ? error.message : error,
                                    });
                                    await send("error", { message });
                                }
                            } finally {
                                request.signal.removeEventListener("abort", onClientAbort);
                                try {
                                    await writer.close();
                                } catch {
                                    /* ignore */
                                }
                            }
                        })();

                        return new Response(readable, {
                            headers: {
                                ...getCorsHeaders(request),
                                "Content-Type": "text/event-stream; charset=utf-8",
                                "Cache-Control": "no-cache, no-transform",
                                "X-Accel-Buffering": "no",
                            },
                        });
                    } catch (error) {
                        log({
                            level: "warn",
                            message: "AI 流式对话初始化失败",
                            path: "/api/ai/chat",
                            method: "POST",
                            details: error instanceof Error ? error.message : error,
                        });
                        return createJsonResponse(
                            { success: false, message: "AI 对话初始化失败，请重试" },
                            request,
                            { status: 502 }
                        );
                    }
                }

                // 链接检测 API - 批量检测站点链接可用性
                else if (path === "check-links" && method === "POST") {
                    const data = await validateRequestBody(request) as { urls: string[] };
                    
                    if (!data.urls || !Array.isArray(data.urls) || data.urls.length === 0) {
                        return createJsonResponse(
                            { success: false, message: '请提供要检测的URL列表' },
                            request,
                            { status: 400 }
                        );
                    }

                    // 限制每次检测数量，防止超出免费额度
                    const MAX_CHECK = 20;
                    const urlsToCheck = data.urls.slice(0, MAX_CHECK);

                    // 并发检测，但限制并发数避免超限
                    const results = await checkLinksConcurrent(urlsToCheck, 5);
                    
                    return createJsonResponse({ success: true, results }, request);
                }

                // 书签脚本添加站点 API - 支持跨域
                else if (path === "bookmarklet/add" && method === "POST") {
                    const data = await validateRequestBody(request) as {
                        name: string;
                        url: string;
                        icon?: string;
                        description?: string;
                        group_id?: number;
                    };

                    if (!data.name || !data.url) {
                        return createJsonResponse(
                            { success: false, message: '站点名称和URL不能为空' },
                            request,
                            { status: 400 }
                        );
                    }

                    // 验证URL
                    let url = data.url.trim();
                    if (!/^https?:\/\//i.test(url)) {
                        url = 'https://' + url;
                    }
                    try {
                        new URL(url);
                    } catch {
                        return createJsonResponse(
                            { success: false, message: '无效的URL格式' },
                            request,
                            { status: 400 }
                        );
                    }

                    // 如果没有指定分组，使用第一个分组或创建默认分组
                    let groupId = data.group_id;
                    if (!groupId) {
                        const groups = await api.getGroups();
                        const firstGroup = groups.length > 0 ? groups[0] : null;
                        if (firstGroup && firstGroup.id) {
                            groupId = firstGroup.id;
                        } else {
                            // 创建默认分组
                            const defaultGroup = await api.createGroup({
                                name: '书签导入',
                                order_num: 0,
                                is_public: 1,
                            });
                            groupId = defaultGroup.id!;
                        }
                    }


                    // 自动获取图标
                    let icon = data.icon || '';
                    if (!icon) {
                        // URL 已在上方校验（见 bookmarklet/add 路由），此处直接安全解析域名
                        const domain = new URL(url).hostname;
                        icon = `https://www.faviconextractor.com/favicon/${domain}?larger=true`;
                    }

                    const site = await api.createSite({
                        group_id: groupId!,
                        name: data.name,
                        url: url,
                        icon: icon,
                        description: data.description || '',
                        notes: '',
                        order_num: 0,
                        is_public: 1,
                    });

                    return createJsonResponse({ success: true, site }, request);
                }

                // 默认返回404
                return createResponse("API路径不存在", request, { status: 404 });

            } catch (error) {
                return createErrorResponse(error, request, 'API 请求');
            }
        }

        // 非API路由默认返回404
        return createResponse("Not Found", request, { status: 404 });
    },
} satisfies ExportedHandler;

// 验证用接口
interface LoginInput {
    username?: string;
    password?: string;
    rememberMe?: boolean;
}

interface GroupInput {
    name?: string;
    order_num?: number;
    is_public?: number;
}

interface SiteInput {
    group_id?: number;
    name?: string;
    url?: string;
    icon?: string;
    description?: string;
    notes?: string;
    order_num?: number;
    is_public?: number;
}

interface ConfigInput {
    value?: string;
}

interface AiSettingsInput {
    enabled?: boolean;
    baseUrl?: string;
    model?: string;
    models?: string[];
    systemPrompt?: string;
    toolsEnabled?: boolean;
    tokenBudget?: number;
    extSkillsEnabled?: boolean;
    apiKey?: string;
}
// ============================================================================
// AI 技能（函数调用）层：站内检索 / 分组查询 / 排行推荐 + 省 token 历史裁剪 + 降级兜底
// ============================================================================

/** OpenAI 兼容消息（含技能调用的 assistant 消息与 tool 结果消息） */
interface ChatMessage {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    tool_calls?: {
        id: string;
        type: string;
        function: { name: string; arguments: string };
    }[];
    tool_call_id?: string;
}

/** 发给上游 /chat/completions 的请求体（tools 由技能开关决定是否附带） */
interface ChatCompletionBody {
    model: string;
    messages: ChatMessage[];
    temperature: number;
    stream: boolean;
    tools?: unknown;
    tool_choice?: "auto" | "none" | "required";
}

/** 技能（函数）定义：OpenAI 兼容 schema */
interface AiToolDefinition {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: "object";
            properties?: Record<string, unknown>;
            required?: string[];
            additionalProperties?: boolean;
        };
    };
}

/** 技能清单：模型可调用的站内查询函数（当前 schema 无点击统计表，排行按站内排序字段取前列） */
const AI_SKILL_TOOLS: AiToolDefinition[] = [
    {
        type: "function",
        function: {
            name: "search_sites",
            description:
                "按关键词/标签检索站内站点库；关键词为空时列出全站站点。适用于“有没有 xx 网站 / 帮我搜下 xx / 有哪些支持 xx 标签的站点”这类问题。",
            parameters: {
                type: "object",
                properties: {
                    keyword: {
                        type: "string",
                        description: "搜索关键词，可匹配站点名称/描述/分组名；可留空表示列出全部站点",
                    },
                    tag: {
                        type: "string",
                        description: "按分组名过滤（例如 常用工具、开发资源）；可留空",
                    },
                    limit: {
                        type: "number",
                        description: "返回条数上限，默认 10，最大 20",
                    },
                },
                additionalProperties: false,
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_group_sites",
            description:
                "获取指定分组下的站点列表。适用于“xx 分组下有哪些网站 / 把 xx 分组的站点给我看看”。",
            parameters: {
                type: "object",
                properties: {
                    groupName: {
                        type: "string",
                        description: "分组名称（支持模糊匹配）",
                    },
                    limit: {
                        type: "number",
                        description: "返回条数上限，默认 10，最大 20",
                    },
                },
                required: ["groupName"],
                additionalProperties: false,
            },
        },
    },
{
        type: "function",
        function: {
            name: "get_site_rankings",
            description:
                "返回站内站点排行（按站内排序字段列出的靠前站点，人工维护的高优先级站点优先）。适用于“有哪些热门/推荐的网站 / 推荐几个站点”这类问题。",
            parameters: {
                type: "object",
                properties: {
                    limit: {
                        type: "number",
                        description: "返回条数上限，默认 10，最大 20",
                    },
                },
                additionalProperties: false,
            },
        },
    },
    {
        type: "function",
        function: {
            name: "list_groups",
            description:
                "返回站内全部分组（名称与站点数量）。适用于“这个站有哪些分组 / 站点是怎么分类的 / 有哪些分类”。",
            parameters: {
                type: "object",
                properties: {
                    limit: {
                        type: "number",
                        description: "返回条数上限，默认 30，最大 100",
                    },
                },
                additionalProperties: false,
            },
        },
    },
];
/** 估算文本占用的 token 数：CJK 字符按 1 字符 ≈1 token，其余按 4 字符 ≈1 token */
function estimateTokens(text: string): number {
    let cjk = 0;
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (
            (code >= 0x4e00 && code <= 0x9fff) || // CJK 统一表意文字
            (code >= 0x3400 && code <= 0x4dbf) || // 扩展 A
            (code >= 0x3000 && code <= 0x303f) || // CJK 标点
            (code >= 0xff00 && code <= 0xffef) || // 全角字符
            (code >= 0xac00 && code <= 0xd7af) // 韩文音节
        ) {
            cjk++;
        }
    }
    return cjk + Math.ceil((text.length - cjk) / 4);
}

/** 滑动历史窗口：在 Token 预算内尽量保留靠后的消息（最近优先），最多丢弃 20 条 */
function trimHistoryWithinBudget(
    history: { role: "user" | "assistant"; content: string }[],
    budget: number,
    systemContent: string
): { history: { role: "user" | "assistant"; content: string }[]; dropped: number } {
    if (!Number.isFinite(budget) || budget < 1000 || history.length <= 2) {
        return { history, dropped: 0 };
    }
    const budgetNum = Math.min(8000, Math.round(budget));
    const est = history.map((m) => estimateTokens(m.content));
    // 每条消息还有 role/换行等固定包装开销，预留一部分配额
    const reservedPer = 24;
    const reservedOthers = est.reduce((sum, n) => sum + Math.min(32, n), 0);
    const available = Math.max(200, budgetNum - reservedOthers);
    let total = estimateTokens(systemContent);
    const kept: { role: "user" | "assistant"; content: string }[] = [];
    let dropped = 0;
    for (let i = history.length - 1; i >= 0 && dropped <= 20; i--) {
        const item = history[i];
        if (!item) continue;
        const need = (est[i] ?? 0) + reservedPer;
        if (total + need > available) {
            dropped++;
            continue;
        }
        kept.unshift(item);
        total += need;
    }
    if (kept.length === 0) {
        // 预算极小或单条超预算时，至少保留最后一条（通常是用户最新提问）
        const lastItem = history[history.length - 1];
        if (!lastItem) return { history, dropped: 0 };
        return {
            history: [lastItem],
            dropped: history.length - 1,
        };
    }
    const finalDropped = history.length - kept.length;
    const finalKept =
        finalDropped <= 20 ? kept : kept.slice(kept.length - (history.length - 20));
    return {
        history: finalKept,
        dropped: history.length - finalKept.length,
    };
}

/** 识别上游「不支持函数调用」类错误（404 或 400/422/501 且提示与 tools/function calling 相关） */
function isToolsUnsupportedError(status: number, detail: string): boolean {
    if (status === 404) return true;
    if (status !== 400 && status !== 422 && status !== 501) return false;
    const d = (detail || "").toLowerCase();
    return (
        d.includes("tools") ||
        d.includes("function call") ||
        d.includes("function_call") ||
        d.includes("not supported") ||
        d.includes("not support") ||
        d.includes("unknown parameter") ||
        d.includes("unrecognized") ||
        d.includes("extra inputs") ||
        d.includes("unexpected")
    );
}

/** 解析 Token 预算配置（D1 中存字符串）：0 或非法值时表示不限制历史长度；正整数收敛在 1000–8000 */
function parseTokenBudget(raw?: string | null): number {
    const n = Number(raw || "");
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(8000, Math.max(1000, Math.round(n)));
}

/** SSE 流式对话的空闲超时（ms）：每收到一个 chunk 自动重置计时器；只有 30s 完全无数据才中止。
 *  不再使用固定总超时——慢但仍在出字的模型永不超时，杜绝「等太久/不响应」。 */
const STREAM_IDLE_TIMEOUT_MS = 30000;

/** 流式增量（OpenAI SSE delta 结构的一个子集） */
interface StreamDelta {
    content?: string;
    tool_calls?: {
        index?: number;
        id?: string;
        type?: string;
        function?: { name?: string; arguments?: string };
    }[];
}

/** 带空闲超时的 fetch：响应体包装为「空闲 idleMs 毫秒无数据即中止底层 fetch」的流；
 *  父信号（客户端停止）任一触发同样中止，联动停止上游生成、避免配额浪费。 */
async function fetchWithIdleTimeout(
    input: string,
    init: RequestInit,
    idleMs: number
): Promise<Response> {
    const ctrl = new AbortController();
    const parent = init.signal;
    const onParentAbort = () => ctrl.abort();
    parent?.addEventListener("abort", onParentAbort, { once: true });

    const res = await fetch(input, { ...init, signal: ctrl.signal });
    if (!res.body) return res;

    const body = new ReadableStream<Uint8Array>({
        async start(controller) {
            const reader = res.body!.getReader();
            let idleTimer: ReturnType<typeof setTimeout> | null = null;
            const resetIdle = () => {
                if (idleTimer) clearTimeout(idleTimer);
                idleTimer = setTimeout(() => ctrl.abort(), idleMs);
            };
            resetIdle();
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    resetIdle();
                    controller.enqueue(value);
                }
            } catch {
                // 中止（空闲超时/客户端停止）或上游断流：自然结束
            } finally {
                if (idleTimer) clearTimeout(idleTimer);
                try {
                    reader.releaseLock();
                } catch {
                    /* ignore */
                }
                try {
                    controller.close();
                } catch {
                    /* ignore */
                }
            }
        },
        cancel() {
            ctrl.abort();
        },
    });

    return new Response(body, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
    });
}

/** 逐事件解析上游 SSE 流：每取到一个 delta 交给 onDelta 处理；收到 [DONE] 或流结束即返回。
 *  支持 CRLF/LF、多行 data: 拼接；单条分片解析失败仅跳过，不中断整段流。 */
async function parseUpstreamSSE(
    response: Response,
    onDelta: (delta: StreamDelta) => Promise<void>,
    signal?: AbortSignal
): Promise<void> {
    const body = response.body;
    if (!body) return;
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // 处理当前缓冲中的完整事件块；返回 true 表示已读到终止标记 [DONE]
    const flush = async (): Promise<boolean> => {
        buffer = buffer.replace(/\r\n/g, "\n");
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
            const dataLines: string[] = [];
            for (const line of part.split("\n")) {
                if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
            }
            if (dataLines.length === 0) continue;
            const dataStr = dataLines.join("\n");
            if (dataStr === "[DONE]") return true;
            try {
                const json = JSON.parse(dataStr) as {
                    choices?: { delta?: StreamDelta }[];
                };
                const delta = json.choices?.[0]?.delta;
                if (delta) await onDelta(delta);
            } catch {
                /* 忽略无法解析的分片（分包边界不会影响整体性） */
            }
        }
        return false;
    };

    try {
        while (true) {
            if (signal?.aborted) break;
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            if (await flush()) break;
        }
        buffer += decoder.decode(); // 解码尾部残留
        await flush();
    } catch {
        // 中止（空闲超时/客户端停止）或上游断流：由调用方根据 signal 区分超时与停止
    } finally {
        try {
            reader.releaseLock();
        } catch {
            /* ignore */
        }
    }
}

/** 无需技能检索的极简「寒暄/闲聊」句式：命中时跳过函数调用环路，模型单轮直接作答 */
const SIMPLE_CHAT_PATTERNS: RegExp[] = [
    // 问候（含语气词与常见拖尾）
    /^(hi|hello|hey|yo|hai|hiya|hello there|嗨|哈喽|哈啰|你好|您好|你们好|大家好|早上好|中午好|下午好|晚上好|在吗|在不在)(呀|啊|吗|呢|哇|哈|哦|噢|捏|鸭)?[，。,.!！?？\s]*$/i,
    // 感谢与确认
    /^(谢谢|多谢|感谢|谢谢啦|谢谢了|辛苦了|受教了|明白了|懂了|知道了|好的|好滴|好的呢|没问题|收到|ok|okay|thx|thanks|thank you|ty|3q)[，。,.!！?？\s]*(呀|啦|了|呢|哦|哈)?$/i,
    // 自我介绍 / 能力询问
    /^(你是谁|你是干什么的|你是干啥的|你能(做什么|干嘛|干啥|帮什么忙)|介绍一下你(自己)?|what can you do|who are you)(呀|啊|呢|吗)?[，。,.!！?？\s]*$/i,
    // 结束 / 纯闲聊
    /^((先这样|就到这(里)?|结束|再见|拜拜|回见|下次再说|没了|没事了|随便聊聊|随便说点什么|聊聊|聊聊天)(吧|啦|了|哟)?|bye|goodbye|see you|ok bye)$/i,
];

/** 判断用户最新消息是否为「简单寒暄/闲聊」：是则单轮直接作答，不发技能检索请求 */
function isSimpleChatMessage(text: string): boolean {
    const t = (text || "").trim();
    if (!t || t.length > 30) return false;
    return SIMPLE_CHAT_PATTERNS.some((re) => re.test(t));
}
/**
 * 检索站点（技能用）：关键词匹配站点名称/描述/分组名，tag 额外按分组名过滤；
 * 可见性策略与 GET /api/sites 未认证分支一致（仅公开分组下的公开站点）。
 */
async function searchSites(
    env: Env,
    keyword: string,
    tag: string,
    limit: number
): Promise<
    Array<{ name: string; url: string; description: string; group_name: string }>
> {
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    if (keyword) {
        conditions.push("(s.name LIKE ? OR s.description LIKE ? OR g.name LIKE ?)");
        const like = `%${keyword}%`;
        params.push(like, like, like);
    }
    if (tag) {
        conditions.push("g.name LIKE ?");
        params.push(`%${tag}%`);
    }
    conditions.push("g.is_public IS NOT 0", "s.is_public IS NOT 0");

    let query = `
        SELECT s.name, s.url, COALESCE(s.description, '') AS description, g.name AS group_name
        FROM sites s
        INNER JOIN groups g ON s.group_id = g.id
        WHERE ${conditions.join(" AND ")}
    `;
    query += ` ORDER BY g.order_num ASC, s.order_num ASC LIMIT ${Math.max(
        1,
        Math.min(20, limit)
    )}`;

    const result = await env.DB.prepare(query)
        .bind(...params)
        .all<{
            name: string;
            url: string;
            description: string;
            group_name: string;
        }>();
    return result.results || [];
}

/** 获取站内推荐站点（按分组/站点排序字段列出的靠前站点，仅公开站点） */
async function getHotSites(
    env: Env,
    limit: number
): Promise<
    Array<{
        name: string;
        url: string;
        description: string;
        group_name: string;
    }>
> {
    const query = `
        SELECT s.name, s.url, COALESCE(s.description, '') AS description, g.name AS group_name
        FROM sites s
        INNER JOIN groups g ON s.group_id = g.id
        WHERE g.is_public IS NOT 0 AND s.is_public IS NOT 0
        ORDER BY g.order_num ASC, s.order_num ASC
        LIMIT ${Math.max(1, Math.min(20, limit))}
    `;
    const result = await env.DB.prepare(query).all<{
        name: string;
        url: string;
        description: string;
        group_name: string;
    }>();
    return result.results || [];
}

/** 全部分组与站点数量（仅公开分组，技能用） */
async function listSiteGroups(
    env: Env,
    limit: number
): Promise<Array<{ name: string; siteCount: number }>> {
    const query = `
        SELECT g.name, COUNT(s.id) AS siteCount
        FROM groups g
        LEFT JOIN sites s ON s.group_id = g.id AND s.is_public IS NOT 0
        WHERE g.is_public IS NOT 0
        GROUP BY g.id
        ORDER BY g.order_num ASC
        LIMIT ${Math.max(1, Math.min(100, limit))}
    `;
    const result = await env.DB.prepare(query).all<{ name: string; siteCount: number }>();
    return result.results || [];
}
/** 将技能结果格式化为简短文本（限定行数，控制 token 用量） */
function formatSkillResult<T extends { name: string }>(
    title: string,
    rows: T[],
    line: (row: T, index: number) => string
): string {
    const lines = rows.slice(0, 20).map((row, i) => line(row, i));
    return `${title}（共 ${rows.length} 条）：\n${lines.join("\n")}`;
}

/** 执行单个 AI 技能：转换为可回传给模型的文本结果 */
async function executeAISkill(
    env: Env,
    name: string,
    args: Record<string, unknown>
): Promise<string> {
    // 扩展技能（学术检索/任务建议/概念教学）分发到独立执行器；基础技能走下方分支
    if (EXT_SKILL_NAMES.includes(name)) {
        return executeExtAISkill(env, name, args);
    }
    const kw = typeof args.keyword === "string" ? args.keyword.trim() : "";
    const tag = typeof args.tag === "string" ? args.tag.trim() : "";
    const group = typeof args.groupName === "string" ? args.groupName.trim() : "";
    const rawLimit = typeof args.limit === "number" ? args.limit : 10;
    const limit = Math.max(1, Math.min(20, Math.floor(rawLimit)));

    if (name === "search_sites") {
        const rows = await searchSites(env, kw, tag, limit);
        if (rows.length === 0) {
            return `搜索「${kw || tag || "全部站点"}」未找到匹配站点`;
        }
        return formatSkillResult(
            "站点搜索结果",
            rows,
            (r) => `- ${r.name}（${r.group_name}）｜${r.description || "暂无描述"}｜${r.url}`
        );
    }
    if (name === "get_group_sites") {
        if (!group) return "请提供要查询的分组名称（groupName）";
        const rows = await searchSites(env, "", group, limit);
        if (rows.length === 0) {
            return `未找到分组「${group}」，可调用 list_groups 查看现有分组`;
        }
        return formatSkillResult(
            `分组「${group}」的站点`,
            rows,
            (r) => `- ${r.name}｜${r.description || "暂无描述"}｜${r.url}`
        );
    }
    if (name === "get_site_rankings") {
        const rows = await getHotSites(env, limit);
        if (rows.length === 0) return "暂时没有可推荐的站点";
        return formatSkillResult(
            "站内推荐站点排行",
            rows,
            (r, i) =>
                `${i + 1}. ${r.name}（${r.group_name}）｜${r.url}｜${r.description || "暂无描述"}`
        );
    }
    if (name === "list_groups") {
        const groups = await listSiteGroups(env, limit > 20 ? limit : 30);
        if (groups.length === 0) return "站点库中还没有任何分组";
        return `站内全部分组（${groups.length} 个）：\n${groups
            .map((g) => `- ${g.name}（${g.siteCount} 个站点）`)
            .join("\n")}`;
    }
    return `未知技能「${name}」，可用技能：${[...AI_SKILL_TOOLS, ...EXT_AI_SKILL_TOOLS]
        .map((t) => t.function.name)
        .join("、")}`;
}

/** 知识注入兜底：把站内站点库摘要嵌入系统提示词（技能关闭或上游不支持时使用） */
async function buildKnowledgeContext(env: Env, userPrompt: string): Promise<string> {
    try {
        const sites = await getHotSites(env, 6);
        if (sites.length === 0) return "";
        const digest = sites
            .map(
                (s, i) =>
                    `${i + 1}. ${s.name}：${s.url}（分组：${s.group_name}；${s.description || "暂无描述"}）`
            )
            .join("\n");
        const focus = userPrompt
            ? `（用户最近关注：${userPrompt.slice(0, 40)}${userPrompt.length > 40 ? "…" : ""}）`
            : "";
        return `\n\n【站内站点库速览】为帮助你基于本导航站真实数据作答，列出现有热点站点：\n${digest}\n${focus}\n回答中引用站点时请使用上述真实 URL。`;
    } catch (error) {
        log({
            level: "warn",
            message: "构建站点库摘要失败，跳过知识注入",
            path: "/api/ai/chat",
            method: "POST",
            details: error instanceof Error ? error.message : error,
        });
        return "";
    }
}

// ============================================================================
// AI 扩展技能（混合分期①）：学术真实检索（Semantic Scholar→arXiv 兜底） /
//   任务规划建议（源自 wayfinder：先规划不执行、拆成可执行步骤） /
//   概念教学（源自 teach：一节一概念 + 速查卡；百科真实抓取留待二期）。
//   省 token 策略：工具描述要求缺失参数用默认值且一轮作答，结果文本压缩字数。
// ============================================================================

/** 扩展技能名集合：executeAISkill 据此分发到独立执行器 */
const EXT_SKILL_NAMES = [
    "search_academic_literature",
    "recommend_next_actions",
    "teach_concept",
];

/** 扩展技能工具定义（OpenAI 兼容）；描述中明确「缺失参数用默认值、直接作答」以减少追问轮次 */
const EXT_AI_SKILL_TOOLS: AiToolDefinition[] = [
    {
        type: "function",
        function: {
            name: "search_academic_literature",
            description:
                "学术文献/论文检索（Semantic Scholar 主源，失败自动退回 arXiv）。适用于找论文、文献、综述、课题相关研究。结果已精简并附链接，缺失参数一律用默认值（limit=5），若信息足够请直接作答并结束，不要追问。",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "检索关键词/课题，例如「大语言模型 评测」或「LLM benchmark」",
                    },
                    limit: {
                        type: "number",
                        description: "返回条数上限，默认 5，最大 10",
                    },
                    year: {
                        type: "number",
                        description: "可选：只看某年及之后的文献（例如 2023）",
                    },
                },
                required: ["query"],
                additionalProperties: false,
            },
        },
    },
    {
        type: "function",
        function: {
            name: "recommend_next_actions",
            description:
                "任务规划与建议（源自 wayfinder：先规划、不替用户执行，把目标拆成由近及远的可执行步骤，给出明确的下一步）。适用于「接下来怎么做 / 帮我规划 / 想达成某目标 / 该先做什么」。返回精简步骤地图，直接据此作答。",
            parameters: {
                type: "object",
                properties: {
                    goal: {
                        type: "string",
                        description: "用户想达成的目标或当前任务描述",
                    },
                },
                required: ["goal"],
                additionalProperties: false,
            },
        },
    },
    {
        type: "function",
        function: {
            name: "teach_concept",
            description:
                "概念教学（源自 teach：目标驱动、一节课讲清一个概念，含一句话理解/要点/例子/速查卡/下一步学什么）。适用于「什么是xx / 讲一下xx原理 / 怎么理解xx / 科普 / 入门」。返回教学框架供直接成文。",
            parameters: {
                type: "object",
                properties: {
                    topic: {
                        type: "string",
                        description: "要讲解的概念/名词，例如「提示词工程」或「向量数据库」",
                    },
                    audience: {
                        type: "string",
                        enum: ["beginner", "intermediate", "advanced"],
                        description: "受众水平，默认 beginner（初学者）",
                    },
                },
                required: ["topic"],
                additionalProperties: false,
            },
        },
    },
];

/** 内置知识词条（教学用；百科真实抓取留待二期，命中时零外部请求、几乎零延迟） */
interface BaikeSeedEntry {
    keys: string[];
    def: string;
    core: string;
    points: string[];
    example: string;
    pitfall: string;
    next: string;
}

const BAIKE_SEED: BaikeSeedEntry[] = [
    {
        keys: ["提示词工程", "prompt"],
        def: "提示词工程 Prompt Engineering：通过设计与优化发送给 AI 模型的指令，让输出更准确、可控、稳定的工程实践。",
        core: "一句话理解：模型怎么猜，取决于你怎么说——把意图讲清楚、给例子、给边界，答案就稳。",
        points: [
            "结构化指令（角色+目标+背景+输出格式）远好于一句话提问",
            "给示例（Few-shot）比只给描述更可靠",
            "把大任务拆成小步骤（思维链），模型更易按图索骥",
            "明确负面约束：告诉模型「不要做什么」",
        ],
        example: "「你是一名产品经理，为 XX 功能写一页立项方案，分背景/目标/方案/风险四节，每节不超过 3 行」。",
        pitfall: "没有万能咒语，效果要靠针对输出迭代调优。",
        next: "进阶：上下文窗口与 Token 预算、函数调用/Agent、思维链评测。",
    },
    {
        keys: ["向量数据库", "vector"],
        def: "向量数据库：以向量（高维数值）形式存储并支持相似度检索的数据库，是 RAG 与语义搜索的核心组件。",
        core: "一句话理解：把内容编码成坐标，找语义相近的邻居，而不是逐字匹配关键词。",
        points: [
            "向量来自嵌入模型（Embedding），同一模型编码才有可比性",
            "相似度常用余弦距离；可按元数据过滤后再召回",
            "索引（如 HNSW/IVF）决定检索速度与精度取舍",
            "典型场景：RAG 检索、推荐、去重",
        ],
        example: "把 10 万篇文档切片编码入库，提问时把问题也编码，取相似度最高的 Top-5 片段喂给大模型作答。",
        pitfall: "检索质量上限往往取决于切片质量与嵌入模型，而不是库的规模。",
        next: "进阶：RAG 评估（检索召回 / 生成忠实度）、混合检索（向量 + BM25）。",
    },
    {
        keys: ["收藏", "书签", "导航站"],
        def: "收藏/书签管理：把常用网址集中收集、分组归类并快速检索的工作流，避免信息散落与重复查找。",
        core: "一句话理解：让「要用时找得到」变成「事后一眼找到」，核心是分组清晰 + 检索快。",
        points: [
            "分组命名短且直观，层级不要太深（≤2 层）",
            "定期清点，删掉不再用的收藏",
            "用搜索代替翻找：按名称/描述/分组检索",
            "重要站点写上一句用途描述，方便未来想起",
        ],
        example: "NaviHive 里把 AI 工具统一放进「AI 工具」分组，每个站点写一句用途，需要时直接用搜索框定位。",
        pitfall: "收藏越多越没用，关键是持续整理，而不是只进不出。",
        next: "进阶：用标签/星标做多维度组织，或用脚本批量清理死链。",
    },
    {
        keys: ["思维链", "chain of thought"],
        def: "思维链 Chain-of-Thought：让模型把推理过程分步写出来再下结论，显著提升复杂推理正确率的提示技巧。",
        core: "一句话理解：逼模型「先想后答」，把中间步骤摆出来，算错自然变少。",
        points: [
            "对数学/逻辑/多步推理类任务效果最好",
            "实现方式：示范「第一步/第二步…」或要求逐步思考",
            "代价是多消耗输出 token，简单任务反而没必要",
            "顺序讲究：先给推理链，再给最终结论",
        ],
        example: "「一件衣服 120 元打七折再满减 15 元，实付多少？」答：折后 84 元，满减后 69 元，实付 69 元。",
        pitfall: "简单问题强加思维链会浪费 token，甚至引入多余错误。",
        next: "进阶：Let's think step by step 的失效与触发、自我一致性投票。",
    },
];

/** 学术论文条目（Semantic Scholar 与 arXiv 归一化的公共形态） */
interface AcademicPaper {
    title: string;
    authors: string[];
    year: number | null;
    venue: string;
    abstract: string;
    url: string;
    citationCount: number | null;
}

function decodeXmlEntities(s: string): string {
    return s
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, "&");
}

/** 解析 arXiv Atom XML（标题/作者/摘要/链接/年份），取前 limit 条 */
function parseArxivAtom(xml: string, limit: number): AcademicPaper[] {
    const papers: AcademicPaper[] = [];
    const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
    let m: RegExpExecArray | null;
    while ((m = entryRe.exec(xml)) !== null && papers.length < limit) {
        const body = m[1];
        if (!body) continue;
        const grab = (re: RegExp) => {
            const t = body.match(re);
            return t?.[1] ? decodeXmlEntities(t[1].trim().replace(/\s+/g, " ")) : "";
        };
        const title = grab(/<title[^>]*>([\s\S]*?)<\/title>/);
        if (!title) continue;
        const authors: string[] = [];
        const authorRe = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g;
        let am: RegExpExecArray | null;
        while ((am = authorRe.exec(body)) !== null) {
            const name = am[1] ? decodeXmlEntities(am[1].trim()) : "";
            if (name) authors.push(name);
        }
        const yearM = body.match(/<published[^>]*>(\d{4})-/);
        papers.push({
            title,
            authors: authors.slice(0, 6),
            year: yearM?.[1] ? Number(yearM[1]) : null,
            venue: "arXiv",
            abstract: grab(/<summary[^>]*>([\s\S]*?)<\/summary>/).slice(0, 200),
            url: body.match(/<id[^>]*>([\s\S]*?)<\/id>/)?.[1]?.trim() ?? "",
            citationCount: null,
        });
    }
    return papers;
}

/** 学术文献检索：Semantic Scholar 优先，失败/空结果自动退 arXiv（两者均为免密钥公开 API） */
async function searchAcademicLiterature(
    query: string,
    limit: number,
    year?: number
): Promise<string> {
    const kw = (query || "").trim().slice(0, 160);
    if (!kw) return "请提供检索关键词（query），例如「大语言模型 评测」。";
    const n = Math.max(1, Math.min(10, Math.floor(Number.isFinite(limit) ? limit : 5)));

    let papers: AcademicPaper[] = [];
    let source = "";

    // 主源：Semantic Scholar Graph API（公开、免密钥）
    try {
        const params = new URLSearchParams({
            query: kw,
            limit: String(n),
            fields: "title,authors,year,venue,abstract,citationCount,url",
        });
        if (year && Number.isFinite(year)) params.set("year", `${Math.max(1900, year)}-`);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(
            `https://api.semanticscholar.org/graph/v1/paper/search?${params.toString()}`,
            { headers: { "User-Agent": "NaviHive-Assistant/1.0" }, signal: controller.signal }
        );
        clearTimeout(timer);
        if (res.ok) {
            const data = (await res.json()) as {
                data?: Array<{
                    title?: string;
                    authors?: Array<{ name?: string }>;
                    year?: number;
                    venue?: string;
                    abstract?: string;
                    citationCount?: number;
                    url?: string;
                }>;
            };
            papers = (data.data || []).slice(0, n).map((p) => ({
                title: p.title || "未命名论文",
                authors: (p.authors || [])
                    .map((a) => (a && a.name ? a.name : ""))
                    .filter(Boolean)
                    .slice(0, 6),
                year: typeof p.year === "number" ? p.year : null,
                venue: (p.venue || "").slice(0, 60),
                abstract: (p.abstract || "").slice(0, 200),
                url: p.url || "",
                citationCount: typeof p.citationCount === "number" ? p.citationCount : null,
            }));
            if (papers.length > 0) source = "Semantic Scholar";
        }
    } catch {
        // 主源异常：走 arXiv 兜底
    }

    // 兜底源：arXiv（公开 Atom API）
    if (papers.length === 0) {
        try {
            const params = new URLSearchParams({
                search_query: `all:${kw}`,
                start: "0",
                max_results: String(n),
                sortBy: "relevance",
            });
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 12000);
            const res = await fetch(
                `https://export.arxiv.org/api/query?${params.toString()}`,
                { signal: controller.signal }
            );
            clearTimeout(timer);
            if (res.ok) {
                papers = parseArxivAtom(await res.text(), n);
                if (papers.length > 0) source = "arXiv";
            }
        } catch {
            // 双源均失败：返回空结果提示
        }
    }

    if (papers.length === 0) {
        return "学术文献检索暂无结果或外部接口暂不可用，请稍后重试或更换关键词。";
    }

    const head = `学术文献检索结果（来源：${source}，关键词「${kw}」，Top ${papers.length}）：`;
    const lines = papers.map((p, i) => {
        const meta = [p.year ? `${p.year}` : "", p.venue].filter(Boolean).join(", ");
        const authors =
            p.authors.length > 0
                ? p.authors.slice(0, 3).join("、") + (p.authors.length > 3 ? " 等" : "")
                : "未知作者";
        const cite = p.citationCount !== null ? `｜被引 ${p.citationCount}` : "";
        return `${i + 1}. 《${p.title}》${meta ? `（${meta}）` : ""}｜${authors}${cite}\n   摘要：${p.abstract || "（无摘要）"}\n   链接：${p.url || "（无链接）"}`;
    });
    return `${head}\n${lines.join("\n")}`;
}

/** 任务规划与建议（源自 wayfinder）：按目标意图归类，返回由近及远可执行步骤 + 立即下一步 */
async function recommendNextActions(env: Env, goal: string): Promise<string> {
    const g = (goal || "").trim().slice(0, 120);
    if (!g) {
        return "请提供你想达成的目标（goal），例如「整理一批 AI 工具站点」或「学会高效使用导航站」。";
    }
    const lower = g.toLowerCase();
    let path = "探索";
    if (/搜|找|查询|收集|收藏|保存/.test(lower)) path = "检索与收藏";
    else if (/整理|归类|分类|分组|管理/.test(lower)) path = "整理与结构";
    else if (/学|了解|掌握|理解|入门/.test(lower)) path = "学习与教学";
    else if (/推荐|选择|选型|对比|决策/.test(lower)) path = "推荐与决策";

    const stepsMap: Record<string, string[]> = {
        "检索与收藏": [
            "明确要找的内容关键词（越具体越好）",
            "发起站内检索，或让我调用 search_sites 全站搜索",
            "把满意的结果收藏进合适分组（没有就新建）",
        ],
        "整理与结构": [
            "盘点现有分组与站点归属，找出重复与凌乱项",
            "规划新分组层次：命名短直观、层级≤2",
            "批量移动站点归位，删掉过期收藏",
        ],
        "学习与教学": [
            "明确学习主题与目标水平（入门/进阶）",
            "让我调用 teach_concept 把主题拆成一节节「单课时」",
            "每学完一节用速查卡回顾，再进入下一节",
        ],
        "推荐与决策": [
            "收集候选站点/方案（可让我检索或推荐）",
            "对比关键差异：定位、是否免费、维护状态",
            "先小范围试用再敲定主用，避免一次性全换",
        ],
        "探索": [
            "先浏览站内分组目录与推荐排行，建立全局印象",
            "锁定 2-3 个最相关的站点逐个上手体验",
            "有具体疑问随时提问（检索/讲解/规划）",
        ],
    };
    const steps: string[] = stepsMap[path] || stepsMap["探索"] || [];

    // 站内可用资源（失败不影响规划输出）
    let groupsLine = "（暂无公开分组，可先新建）";
    let hotLine = "（暂无热点站点）";
    try {
        const groups = await listSiteGroups(env, 6);
        if (groups.length > 0) groupsLine = groups.slice(0, 4).map((gr) => gr.name).join("、");
        const hot = await getHotSites(env, 3);
        if (hot.length > 0) hotLine = hot.slice(0, 3).map((s) => `${s.name}(${s.url})`).join("、");
    } catch {
        // 忽略：站点库读取失败不影响规划建议
    }

    return `任务规划（目标：${g}）\n意图类型：${path}\n建议步骤（由近及远）：\n${steps
        .map((s, i) => `  ${i + 1}. ${s}`)
        .join("\n")}\n站内可立即利用的资源：\n  - 分组：${groupsLine}\n  - 热点站点：${hotLine}\n立即下一步：完成第 1 步即可开始；若目标仍较模糊，补充背景后我帮你继续细化。`;
}

/** 概念教学（源自 teach）：命中内置词条零外部请求；未命中返回教学框架供模型直接成文 */
function teachConcept(topic: string, audience?: string): string {
    const t = (topic || "").trim().slice(0, 60);
    const level =
        audience === "beginner" || audience === "intermediate" || audience === "advanced"
            ? audience
            : "beginner";
    const levelText =
        level === "beginner" ? "初学者" : level === "intermediate" ? "进阶者" : "高级";
    if (!t) return "请提供要讲解的概念（topic），例如「提示词工程」。";

    const hit = BAIKE_SEED.find((e) => e.keys.some((k) => t.toLowerCase().includes(k)));
    if (hit) {
        return [
            `概念教学（命中内置词条：${t}，受众：${levelText}）`,
            `一句话理解：${hit.core}`,
            `定义：${hit.def}`,
            `核心要点：\n${hit.points.map((p, i) => `  ${i + 1}. ${p}`).join("\n")}`,
            `一个例子：${hit.example}`,
            `常见误区：${hit.pitfall}`,
            `下一步学什么：${hit.next}`,
        ].join("\n");
    }
    return [
        `概念教学框架（${t}，受众：${levelText}；站点内置词条暂无该概念，请按以下结构直接讲授，一节一概念并保持精炼）`,
        `一句话理解：`,
        `定义（一句话）：`,
        `核心要点：\n  1.\n  2.\n  3.`,
        `一个例子：`,
        `常见误区：`,
        `速查卡：`,
        `下一步学什么：`,
    ].join("\n");
}

/** 执行单个扩展技能：转换为可回传给模型的精简文本结果（与 executeAISkill 同一接口形态） */
async function executeExtAISkill(
    env: Env,
    name: string,
    args: Record<string, unknown>
): Promise<string> {
    if (name === "search_academic_literature") {
        const query = typeof args.query === "string" ? args.query : "";
        const limit = typeof args.limit === "number" ? args.limit : 5;
        const year = typeof args.year === "number" ? args.year : undefined;
        return searchAcademicLiterature(query, limit, year);
    }
    if (name === "recommend_next_actions") {
        const goal = typeof args.goal === "string" ? args.goal : "";
        return recommendNextActions(env, goal);
    }
    if (name === "teach_concept") {
        const topic = typeof args.topic === "string" ? args.topic : "";
        const audience = typeof args.audience === "string" ? args.audience : "beginner";
        return teachConcept(topic, audience);
    }
    return `未知扩展技能「${name}」，可用技能：${EXT_SKILL_NAMES.join("、")}`;
}

// 输入验证函数
function validateLogin(data: LoginInput): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!data.username || typeof data.username !== "string") {
        errors.push("用户名不能为空且必须是字符串");
    }

    if (!data.password || typeof data.password !== "string") {
        errors.push("密码不能为空且必须是字符串");
    }

    if (data.rememberMe !== undefined && typeof data.rememberMe !== "boolean") {
        errors.push("记住我选项必须是布尔值");
    }

    return { valid: errors.length === 0, errors };
}

function validateGroup(data: GroupInput): {
    valid: boolean;
    errors?: string[];
    sanitizedData?: Group;
} {
    const errors: string[] = [];
    const sanitizedData: Partial<Group> = {};

    // 验证名称
    if (!data.name || typeof data.name !== "string") {
        errors.push("分组名称不能为空且必须是字符串");
    } else {
        sanitizedData.name = data.name.trim().slice(0, 100); // 限制长度
    }

    // 验证排序号
    if (data.order_num === undefined || typeof data.order_num !== "number") {
        errors.push("排序号必须是数字");
    } else {
        sanitizedData.order_num = data.order_num;
    }

    // 验证 is_public (可选，默认为 1 - 公开)
    if (data.is_public !== undefined) {
        if (typeof data.is_public === "number" && (data.is_public === 0 || data.is_public === 1)) {
            sanitizedData.is_public = data.is_public;
        } else {
            errors.push("is_public 必须是 0 (私密) 或 1 (公开)");
        }
    } else {
        sanitizedData.is_public = 1; // 默认公开
    }

    return {
        valid: errors.length === 0,
        errors,
        sanitizedData: errors.length === 0 ? (sanitizedData as Group) : undefined,
    };
}

function validateSite(data: SiteInput): {
    valid: boolean;
    errors?: string[];
    sanitizedData?: Site;
} {
    const errors: string[] = [];
    const sanitizedData: Partial<Site> = {};

    // 验证分组ID
    if (!data.group_id || typeof data.group_id !== "number") {
        errors.push("分组ID必须是数字且不能为空");
    } else {
        sanitizedData.group_id = data.group_id;
    }

    // 验证名称
    if (!data.name || typeof data.name !== "string") {
        errors.push("站点名称不能为空且必须是字符串");
    } else {
        sanitizedData.name = data.name.trim().slice(0, 100); // 限制长度
    }

    // 验证URL
    if (!data.url || typeof data.url !== "string") {
        errors.push("URL不能为空且必须是字符串");
    } else {
        let url = data.url.trim();
        // 如果没有协议,自动添加 https://
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }
        try {
            // 验证URL格式
            new URL(url);
            sanitizedData.url = url;
        } catch {
            errors.push("无效的URL格式");
        }
    }

    // 验证图标URL (可选)
    if (data.icon !== undefined) {
        if (typeof data.icon !== "string") {
            errors.push("图标URL必须是字符串");
        } else if (data.icon) {
            let iconUrl = data.icon.trim();
            // 如果没有协议,自动添加 https://
            if (!/^https?:\/\//i.test(iconUrl) && !/^data:/i.test(iconUrl)) {
                iconUrl = 'https://' + iconUrl;
            }
            try {
                // 验证URL格式
                new URL(iconUrl);
                sanitizedData.icon = iconUrl;
            } catch {
                errors.push("无效的图标URL格式");
            }
        } else {
            sanitizedData.icon = "";
        }
    }

    // 验证描述 (可选)
    if (data.description !== undefined) {
        sanitizedData.description =
            typeof data.description === "string"
                ? data.description.trim().slice(0, 500) // 限制长度
                : "";
    }

    // 验证备注 (可选)
    if (data.notes !== undefined) {
        sanitizedData.notes =
            typeof data.notes === "string"
                ? data.notes.trim().slice(0, 1000) // 限制长度
                : "";
    }

    // 验证排序号
    if (data.order_num === undefined || typeof data.order_num !== "number") {
        errors.push("排序号必须是数字");
    } else {
        sanitizedData.order_num = data.order_num;
    }

    // 验证 is_public (可选，默认为 1 - 公开)
    if (data.is_public !== undefined) {
        if (typeof data.is_public === "number" && (data.is_public === 0 || data.is_public === 1)) {
            sanitizedData.is_public = data.is_public;
        } else {
            errors.push("is_public 必须是 0 (私密) 或 1 (公开)");
        }
    } else {
        sanitizedData.is_public = 1; // 默认公开
    }

    return {
        valid: errors.length === 0,
        errors,
        sanitizedData: errors.length === 0 ? (sanitizedData as Site) : undefined,
    };
}

function validateConfig(data: ConfigInput): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (data.value === undefined || typeof data.value !== "string") {
        errors.push("配置值必须是字符串类型");
    }

    return { valid: errors.length === 0, errors };
}

// AI 设置校验：返回错误信息数组（空数组表示通过）
function validateAISettings(data: AiSettingsInput): string[] {
    const errors: string[] = [];

    if (data.enabled !== undefined && typeof data.enabled !== "boolean") {
        errors.push("enabled 必须是布尔值");
    }
    if (
        data.baseUrl !== undefined &&
        (typeof data.baseUrl !== "string" || data.baseUrl.trim().length > 500)
    ) {
        errors.push("baseUrl 必须是字符串且不超过 500 字符");
    }
    if (
        data.model !== undefined &&
        (typeof data.model !== "string" || data.model.trim().length > 200)
    ) {
        errors.push("model 必须是字符串且不超过 200 字符");
    }
    if (data.models !== undefined) {
        if (!Array.isArray(data.models) || data.models.length > 20) {
            errors.push("models 必须是数组且最多 20 个模型");
        } else {
            for (const m of data.models) {
                if (typeof m !== "string" || m.trim().length > 200) {
                    errors.push("models 中的每一项必须是字符串且不超过 200 字符");
                    break;
                }
            }
        }
    }
    if (data.systemPrompt !== undefined && typeof data.systemPrompt !== "string") {
        errors.push("systemPrompt 必须是字符串");
    }
    if (
        data.systemPrompt !== undefined &&
        data.systemPrompt.length > 4000
    ) {
        errors.push("systemPrompt 不能超过 4000 字符");
    }
    if (data.toolsEnabled !== undefined && typeof data.toolsEnabled !== "boolean") {
        errors.push("toolsEnabled 必须是布尔值");
    }
    if (
        data.extSkillsEnabled !== undefined &&
        typeof data.extSkillsEnabled !== "boolean"
    ) {
        errors.push("extSkillsEnabled 必须是布尔值");
    }
    if (
        data.tokenBudget !== undefined &&
        (typeof data.tokenBudget !== "number" ||
            !Number.isFinite(data.tokenBudget) ||
            data.tokenBudget < 0 ||
            data.tokenBudget > 8000)
    ) {
        errors.push("tokenBudget 必须是 0–8000 之间的数字（0 表示不限制）");
    }
    if (
        data.apiKey !== undefined &&
        (typeof data.apiKey !== "string" || data.apiKey.trim().length > 1000)
    ) {
        errors.push("apiKey 必须是字符串且不超过 1000 字符");
    }

    return errors;
}

// 声明ExportedHandler类型
interface ExportedHandler {
    fetch(request: Request, env: Env, ctx?: ExecutionContext): Response | Promise<Response>;
}

// 声明Cloudflare Workers的执行上下文类型
interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
    passThroughOnException(): void;
}

// D1类型定义已移至 src/API/http.ts，此处引用即可
// 注意：worker/index.ts 和 src/API/http.ts 在 Cloudflare Workers 中共享同一运行时
// D1Database, D1PreparedStatement, D1Result 由 @cloudflare/workers-types 提供

// ========== 新增辅助函数 ==========

/**
 * 链接检测结果接口
 */
interface LinkCheckResult {
    url: string;
    status: 'ok' | 'redirect' | 'error' | 'timeout';
    statusCode?: number;
    error?: string;
    duration?: number;
}

/**
 * 并发检测链接可用性（限制并发数）
 */
async function checkLinksConcurrent(urls: string[], concurrency: number = 5): Promise<LinkCheckResult[]> {
    const results: LinkCheckResult[] = [];
    const queue = [...urls];
    
    async function worker(): Promise<void> {
        while (queue.length > 0) {
            const url = queue.shift();
            if (!url) continue;
            
            const startTime = Date.now();
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
                
                const response = await fetch(url, {
                    method: 'HEAD',
                    signal: controller.signal,
                    redirect: 'manual', // 不自动跟随重定向，手动处理
                });
                
                clearTimeout(timeoutId);
                const duration = Date.now() - startTime;
                
                if (response.status >= 200 && response.status < 300) {
                    results.push({ url, status: 'ok', statusCode: response.status, duration });
                } else if (response.status >= 300 && response.status < 400) {
                    results.push({ url, status: 'redirect', statusCode: response.status, duration });
                } else {
                    results.push({ url, status: 'error', statusCode: response.status, duration });
                }
            } catch (error: unknown) {
                const err = error as Partial<Error>;
                const duration = Date.now() - startTime;
                if (err.name === 'AbortError') {
                    results.push({ url, status: 'timeout', error: '请求超时', duration });
                } else {
                    results.push({ url, status: 'error', error: err.message || '未知错误', duration });
                }
            }
        }
    }
    
    // 启动并发 workers
    const workers = Array(concurrency).fill(null).map(() => worker());
    await Promise.all(workers);
    
    return results;
}

