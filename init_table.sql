-- 创建分组表
CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    order_num INTEGER NOT NULL,
    is_public INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建站点表
CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    notes TEXT,
    order_num INTEGER NOT NULL,
    is_public INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

-- 创建配置表
CREATE TABLE IF NOT EXISTS configs (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 设置初始化标志
INSERT INTO configs (key, value) VALUES ('DB_INITIALIZED', 'true');

-- AI 辅助功能默认配置
-- 说明：ai.apiKey 由 Worker 在服务端用 AES-256-GCM 加密后写入（密钥来自 AI_SECRET/AUTH_SECRET），
-- 绝不写入明文，也绝不下发到前端；下方仅预置开关与留空的基础配置。
INSERT INTO configs (key, value) VALUES ('ai.enabled', 'false');
INSERT INTO configs (key, value) VALUES ('ai.baseUrl', '');
INSERT INTO configs (key, value) VALUES ('ai.model', '');