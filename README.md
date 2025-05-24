# PDF-Docat: 前后端分离版本

一个现代化的PDF翻译应用，采用前后端分离架构，解决部署和连接性问题。

## 🏗️ 项目架构

```
PDF-Docat/
├── backend-api/          # 🐍 Python FastAPI 后端
│   ├── main.py          # FastAPI 应用主文件
│   ├── requirements.txt # Python 依赖
│   ├── Dockerfile       # Docker 配置
│   ├── .replit          # Replit 部署配置
│   └── README.md        # 后端详细说明
├── frontend-app/        # ⚛️ React 前端
│   ├── src/             # 前端源代码
│   ├── package.json     # Node.js 依赖
│   ├── vite.config.ts   # Vite 构建配置
│   └── README.md        # 前端详细说明
├── DEPLOYMENT_GUIDE.md  # 📖 完整部署指南
└── test-connection.js   # 🧪 连接测试脚本
```

## ✨ 主要特性

### 后端 API (FastAPI)
- 🔄 **PDF 翻译** - 基于 PDFMathTranslate 的高质量翻译
- 🌍 **多语言支持** - 支持 12+ 种语言互译
- 📁 **文件管理** - 自动文件上传、处理和清理
- 🏥 **健康检查** - 实时服务状态监控
- 🔒 **CORS 支持** - 完整的跨域资源共享配置
- 📊 **RESTful API** - 标准化的 API 接口设计

### 前端应用 (React)
- 🎯 **拖拽上传** - 直观的文件选择体验
- 📱 **响应式设计** - 适配桌面和移动设备
- ⚡ **实时状态** - 动态显示 API 连接状态
- 🎨 **现代 UI** - 基于 Tailwind CSS 的美观界面
- 🔄 **双语模式** - 支持原文和译文并排显示
- 📥 **一键下载** - 翻译完成后自动下载

## 🚀 快速开始

### 方案一：分离部署（推荐）

#### 1. 部署后端到 Replit
```bash
# 1. 在 Replit 创建新的 Python 项目
# 2. 上传 backend-api/ 目录下的所有文件
# 3. 在 Replit Shell 中运行：
git clone https://github.com/Byaidu/PDFMathTranslate.git
cd PDFMathTranslate && pip install -e . && cd ..
python main.py

# 4. 记录 Replit 提供的域名，例如：
# https://pdf-docat-api.username.replit.dev
```

#### 2. 部署前端到 Vercel
```bash
# 1. 将 frontend-app/ 推送到 GitHub
cd frontend-app
git init && git add . && git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/pdf-docat-frontend.git
git push -u origin main

# 2. 在 Vercel 连接 GitHub 仓库
# 3. 设置环境变量：
# VITE_API_BASE_URL=https://your-backend-api.replit.dev

# 4. 部署完成！
```

### 方案二：本地开发

#### 后端
```bash
cd backend-api
pip install -r requirements.txt
git clone https://github.com/Byaidu/PDFMathTranslate.git
cd PDFMathTranslate && pip install -e . && cd ..
python main.py
# 后端运行在 http://localhost:8000
```

#### 前端
```bash
cd frontend-app
npm install
cp .env.example .env
# 编辑 .env 文件设置 VITE_API_BASE_URL=http://localhost:8000
npm run dev
# 前端运行在 http://localhost:3000
```

## 🧪 测试连接

使用提供的测试脚本验证前后端连接：

```bash
# 测试本地连接
node test-connection.js

# 测试远程连接
API_BASE_URL=https://your-backend-api.replit.dev node test-connection.js
```

## 📋 API 接口

### 核心端点
- `GET /` - API 信息
- `GET /health` - 健康检查
- `GET /docs` - 交互式 API 文档

### 翻译端点
- `POST /api/v1/translate` - 上传并翻译 PDF
- `GET /api/v1/download/{task_id}` - 下载翻译后的 PDF
- `DELETE /api/v1/cleanup/{task_id}` - 清理临时文件
- `GET /api/v1/supported-languages` - 获取支持的语言

## 🌍 支持的语言

- 🇺🇸 English (en)
- 🇨🇳 Chinese Simplified (zh)
- 🇹🇼 Chinese Traditional (zh-TW)
- 🇯🇵 Japanese (ja)
- 🇰🇷 Korean (ko)
- 🇫🇷 French (fr)
- 🇩🇪 German (de)
- 🇪🇸 Spanish (es)
- 🇮🇹 Italian (it)
- 🇵🇹 Portuguese (pt)
- 🇷🇺 Russian (ru)
- 🇸🇦 Arabic (ar)

## 🛠️ 技术栈

### 后端
- **FastAPI** - 现代 Python Web 框架
- **PDFMathTranslate** - PDF 翻译引擎
- **Uvicorn** - ASGI 服务器
- **Pydantic** - 数据验证

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **TanStack Query** - 数据获取
- **Tailwind CSS** - 样式框架
- **React Dropzone** - 文件上传

## 🔧 故障排除

### 常见问题

1. **CORS 错误**
   - 检查后端 CORS 配置
   - 确认前端域名在允许列表中

2. **API 连接失败**
   - 验证 `VITE_API_BASE_URL` 环境变量
   - 确认后端服务正常运行

3. **文件上传失败**
   - 检查文件格式（仅支持 PDF）
   - 验证文件大小限制

### 调试工具

- 使用 `test-connection.js` 测试 API 连接
- 查看浏览器开发者工具的网络面板
- 检查后端日志输出

## 📈 部署选项

### 后端部署
- **Replit** - 快速部署，适合原型
- **Docker** - 容器化部署
- **云服务** - AWS, Google Cloud, Azure

### 前端部署
- **Vercel** - 零配置部署
- **Netlify** - 静态站点托管
- **GitHub Pages** - 免费托管

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [PDFMathTranslate](https://github.com/Byaidu/PDFMathTranslate) - 核心翻译引擎
- [FastAPI](https://fastapi.tiangolo.com/) - 后端框架
- [React](https://reactjs.org/) - 前端框架

---

**为什么选择前后端分离？**

1. **解决连接问题** - 避免 Replit 的网络限制
2. **独立扩展** - 前后端可以独立部署和扩展
3. **技术灵活性** - 可以选择最适合的托管平台
4. **成本优化** - 根据需求选择不同的服务等级
5. **开发效率** - 团队可以并行开发前后端功能