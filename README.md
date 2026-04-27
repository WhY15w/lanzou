# Lanzou URL Parser

一个基于 Hono 的蓝奏云链接解析服务。

## 📋 项目简介

本项目提供了一个 API 服务，用于解析和获取蓝奏云（Lanzou）分享链接中的文件信息，包括文件名、大小、下载链接等。

## ✨ 主要功能

- **链接解析**：解析蓝奏云分享链接并获取文件信息
- **密码支持**：支持有密码的蓝奏云链接
- **重定向/JSON**：支持直接重定向到下载链接或返回 JSON 响应
- **速率限制**：内置速率限制（15分钟内最多300个请求）
- **跨域支持**：支持 CORS 跨域请求
- **请求日志**：使用 Morgan 记录所有 HTTP 请求

## 🚀 快速开始

### 前置要求

- Node.js 16+
- pnpm 10.33.0+

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm run dev
```

服务会在 `http://localhost:1103` 启动。

### 构建项目

```bash
pnpm run build
```

### 生产模式

```bash
pnpm start
```

## 📚 API 文档

### 获取文件信息

**端点：** `GET /lanzou/`

**查询参数：**

| 参数   | 类型   | 必需 | 说明                                          |
| ------ | ------ | ---- | --------------------------------------------- |
| `url`  | string | ✓    | 蓝奏云分享链接                                |
| `pwd`  | string | ✗    | 分享密码（如果链接有密码）                    |
| `type` | string | ✗    | 响应类型：`json` 或 `redirect`，默认为 `json` |

**示例请求：**

```bash
# 获取文件信息（JSON 格式）
curl "http://localhost:1103/lanzou/?url=https://lanzou.com/xxx"

# 带密码的请求
curl "http://localhost:1103/lanzou/?url=https://lanzou.com/xxx&pwd=1234"

# 重定向到下载链接
curl "http://localhost:1103/lanzou/?url=https://lanzou.com/xxx&type=redirect"
```

**响应示例：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "filename": "example.zip",
    "filesize": "1.2MB",
    "downloads": 100,
    "redirect": "https://..."
  }
}
```

**错误响应：**

```json
{
  "code": 1,
  "message": "error message"
}
```

## ⚙️ 配置说明

默认配置位于 [config/config.ts](config/config.ts)：

- **PORT**：服务监听端口（默认：1103）
- **rateLimit**：速率限制配置
  - `windowMs`：时间窗口（15分钟）
  - `max`：时间窗口内最大请求数（300）

## 📁 项目结构

```
├── app.ts                              # 主应用文件
├── config/
│   └── config.ts                      # 配置文件
├── routes/
│   └── lanzou.ts                      # 蓝奏云 API 路由
├── utils/
│   ├── types.ts                       # 类型定义
│   ├── lanzou/
│   │   ├── anti_acw_sc__v2.ts        # 反爬虫处理
│   │   ├── lanzouHttpClient.ts       # HTTP 客户端
│   │   └── lanzouParser.ts           # URL 解析器
│   └── reply/
│       └── reply.ts                  # 响应格式化
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ 使用的技术栈

- **框架**：Hono
- **语言**：TypeScript
- **HTTP 客户端**：Axios
- **日志**：Morgan
- **跨域**：CORS
- **速率限制**：hono-rate-limiter
- **HTML 解析**：cheerio
- **时间处理**：dayjs

## 📝 脚本命令

| 命令         | 说明                            |
| ------------ | ------------------------------- |
| `pnpm dev`   | 使用 tsx 开发模式运行           |
| `pnpm build` | 将 TypeScript 编译为 JavaScript |
| `pnpm start` | 编译并运行生产版本              |

## ⚠️ 注意事项

- 请遵守蓝奏云的使用条款和协议
- 合理使用 API，避免对服务器造成压力
- 若遇到频繁被限制，可根据需要调整速率限制配置
- 某些蓝奏云链接可能需要特殊的 User-Agent 或其他请求头

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
