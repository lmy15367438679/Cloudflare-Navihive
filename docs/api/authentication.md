# 认证 API

## POST /api/login

用户登录接口。

### 请求

```json
{
  "username": "admin",
  "password": "your-password",
  "rememberMe": false
}
```

**参数说明：**
- `username` (string, 必需): 用户名
- `password` (string, 必需): 密码
- `rememberMe` (boolean, 可选): 是否记住登录状态，默认 false
  - `false`: Token 有效期 7 天
  - `true`: Token 有效期 30 天

### 响应

成功（200）：
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 604800
}
```

失败（401）：
```json
{
  "error": "用户名或密码错误"
}
```

速率限制（429）：
```json
{
  "error": "登录尝试过于频繁，请稍后再试"
}
```

### 速率限制

登录接口有速率限制保护：
- **限制**: 每个 IP 地址 15 分钟内最多 5 次尝试
- **超限后**: 返回 429 状态码，需要等待 15 分钟后才能再次尝试

### Token 存储

登录成功后，Token 会通过两种方式返回：

1. **HttpOnly Cookie**（主要方式）
   - Cookie 名称: `authToken`
   - 属性: `HttpOnly`, `Secure`, `SameSite=Strict`
   - 防止 XSS 攻击窃取 Token

2. **响应体**（兼容方式）
   - 客户端可以将 Token 存储在 localStorage
   - 用于不支持 Cookie 的场景

### 使用示例

```javascript
// 登录
const response = await fetch('/api/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'admin',
    password: 'your-password',
    rememberMe: true,
  }),
  credentials: 'include', // 重要：包含 Cookie
});

const data = await response.json();
console.log('登录成功:', data);
```

## GET /api/auth/status

检查当前认证状态。

### 请求

无需请求体，Token 通过 Cookie 或 Authorization header 自动发送。

### 响应

已认证（200）：
```json
{
  "authenticated": true,
  "username": "admin"
}
```

未认证（401）：
```json
{
  "authenticated": false
}
```

### 使用示例

```javascript
// 检查认证状态
const response = await fetch('/api/auth/status', {
  credentials: 'include', // 包含 Cookie
});

const data = await response.json();
if (data.authenticated) {
  console.log('已登录，用户:', data.username);
} else {
  console.log('未登录');
}
```

## GET /api/auth/enabled

查询认证配置，用于登录页决定是否需要登录以及是否展示「游客访问」入口。

### 请求

无需请求体，无需认证。

### 响应

```json
{
  "enabled": true,
  "guestAvailable": true
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `enabled` | boolean | 是否启用认证（`AUTH_ENABLED`） |
| `guestAvailable` | boolean | 是否开放游客访问：`enabled === true` 且 `AUTH_REQUIRED_FOR_READ !== 'true'` |

### 使用示例

```javascript
// 登录页初始化时读取配置
const response = await fetch('/api/auth/enabled');
const { enabled, guestAvailable } = await response.json();

// guestAvailable 为 true 时，登录页展示「游客访问」按钮
```

## 安全特性

### 1. 密码加密
- 使用 bcrypt 算法
- 10 轮加盐哈希
- 密码永不以明文存储

### 2. JWT Token
- 使用 Web Crypto API 的 HMAC-SHA256 签名
- 包含过期时间验证
- 包含签发时间和用户信息

### 3. HttpOnly Cookie
- 防止 JavaScript 访问，降低 XSS 风险
- Secure 标志确保仅通过 HTTPS 传输
- SameSite 防止 CSRF 攻击

### 4. 速率限制
- 基于 IP 地址的登录尝试限制
- 自动清理过期的限制记录
- 防止暴力破解攻击

## 配置说明

### 环境变量

在 `wrangler.jsonc` 中配置：

```jsonc
{
  "vars": {
    "AUTH_ENABLED": "true",
    "AUTH_REQUIRED_FOR_READ": "false",
    "AUTH_USERNAME": "admin",
    "AUTH_PASSWORD": "$2a$10$...", // bcrypt hash
    "AUTH_SECRET": "your-secret-key-min-32-chars"
  }
}
```

**生成密码哈希：**
```bash
pnpm hash-password your-password
```

### 访客模式

当 `AUTH_REQUIRED_FOR_READ` 设置为 `false` 时：
- 未登录用户可以访问公开内容（`is_public=1`）
- 登录用户可以访问所有内容
- 所有写操作仍需要登录

#### 前端游客会话

`/api/auth/enabled` 返回 `guestAvailable: true` 时，登录页会展示「游客访问 · 浏览公开内容」入口：

| 环节 | 行为 |
|------|------|
| 点击游客访问 | `viewMode` 切换为 `readonly`，`isAuthenticated` 保持 `false`，不生成 Token |
| 数据范围 | 仅显示 `is_public=1` 的分组与站点（后端按认证状态过滤，前端不缓存私密数据） |
| 会话持久化 | 写入 `localStorage` 键 `navihive_guest_mode`，刷新后跳过登录墙直接进入只读模式 |
| 身份标识 | 顶栏标题旁显示「游客」徽标，侧栏底部显示「游客模式 · 仅浏览公开内容」提示 |
| 进入管理员 | 点击侧栏「登录管理员」→ 清除游客标记 → 回到登录页，登录成功后切为 `edit` 模式 |
| 关闭游客模式 | `AUTH_REQUIRED_FOR_READ=true` 时 `guestAvailable` 为 `false`，登录页隐藏入口，已存在的游客标记在下次加载时被清除 |

> 注：游客会话是纯前端状态，不占用后端会话资源；游客不产生 Token，因此无法访问任何写接口（写接口均要求认证）。

## 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 401 | 未认证或认证失败 |
| 429 | 速率限制：请求过于频繁 |
| 500 | 服务器内部错误 |

## 相关链接

- [安全指南](/security/)
- [API 概览](/api/)
