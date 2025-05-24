# PDF-Docat 前后端分离部署指南

本指南将帮助你将PDF-Docat项目拆分为独立的前后端项目，并分别部署到不同的平台。

## 项目架构

```
PDF-Docat (分离后)
├── backend-api/          # 独立的Python FastAPI后端
│   ├── main.py          # FastAPI应用
│   ├── setup.py         # 自动安装脚本
│   ├── requirements.txt # Python依赖
│   ├── Dockerfile       # Docker配置
│   ├── .replit          # Replit配置
│   └── README.md        # 后端说明
└── frontend-app/        # 独立的React前端
    ├── src/             # 源代码
    ├── package.json     # Node.js依赖
    ├── vite.config.ts   # Vite配置
    └── README.md        # 前端说明
```

## 重要说明

本项目使用 **PDFMathTranslate v2-rc 分支** (来自 awwaawwa/PDFMathTranslate 仓库)，提供最新的功能和改进。

## 第一步：部署后端API

### 选项1：Replit.core 部署（推荐）

1. **创建新的Replit项目**
   ```bash
   # 在Replit中创建新的Python项目
   # 项目名称：pdf-docat-api
   ```

2. **上传后端文件**
   - 将 `backend-api/` 目录下的所有文件上传到Replit项目根目录
   - 确保包含：`main.py`, `setup.py`, `requirements.txt`, `.replit`, `Dockerfile`

3. **自动安装PDFMathTranslate (v2-rc)**
   ```bash
   # 在Replit Shell中运行自动安装脚本
   python setup.py
   ```
   
   这将自动：
   - 安装Python依赖
   - 克隆 awwaawwa/PDFMathTranslate 仓库
   - 切换到 v2-rc 分支
   - 安装PDFMathTranslate
   - 创建必要的目录

4. **运行项目**
   ```bash
   python main.py
   ```

5. **获取API域名**
   - Replit会提供一个域名，格式类似：
   - `https://pdf-docat-api.{username}.replit.dev`
   - 记录这个域名，前端需要用到

### 选项2：Docker部署

```bash
# 构建镜像（自动使用v2-rc分支）
cd backend-api
docker build -t pdf-docat-api .

# 运行容器
docker run -p 8000:8000 pdf-docat-api
```

### 选项3：本地开发

#### 方法A：使用自动安装脚本（推荐）
```bash
cd backend-api
python setup.py  # 自动安装所有依赖和PDFMathTranslate v2-rc
python main.py
```

#### 方法B：手动安装
```bash
cd backend-api
pip install -r requirements.txt
git clone https://github.com/awwaawwa/PDFMathTranslate.git
cd PDFMathTranslate
git checkout v2-rc
pip install -e .
cd ..
python main.py
```

## 第二步：部署前端应用

### 选项1：Vercel部署（推荐）

1. **准备代码**
   ```bash
   # 将frontend-app目录推送到GitHub仓库
   cd frontend-app
   git init
   git add .
   git commit -m "Initial frontend commit"
   git remote add origin https://github.com/yourusername/pdf-docat-frontend.git
   git push -u origin main
   ```

2. **Vercel部署**
   - 访问 [vercel.com](https://vercel.com)
   - 连接GitHub仓库
   - 设置环境变量：
     ```
     VITE_API_BASE_URL=https://your-backend-api.replit.dev
     ```
   - 部署完成后获得前端域名

### 选项2：Netlify部署

1. **构建项目**
   ```bash
   cd frontend-app
   npm install
   npm run build
   ```

2. **部署到Netlify**
   - 访问 [netlify.com](https://netlify.com)
   - 拖拽 `dist/` 文件夹到Netlify
   - 或连接GitHub仓库自动部署
   - 设置环境变量：`VITE_API_BASE_URL`

### 选项3：GitHub Pages

1. **构建并部署**
   ```bash
   cd frontend-app
   npm install
   npm run build
   
   # 将dist目录推送到gh-pages分支
   cd dist
   git init
   git add .
   git commit -m "Deploy to GitHub Pages"
   git remote add origin https://github.com/yourusername/pdf-docat-frontend.git
   git push -f origin main:gh-pages
   ```

2. **启用GitHub Pages**
   - 在仓库设置中启用GitHub Pages
   - 选择 `gh-pages` 分支作为源

## 第三步：配置环境变量

### 后端环境变量

在Replit或其他部署平台设置：

```bash
PORT=8000
PYTHONPATH=/app
```

### 前端环境变量

在Vercel、Netlify或其他平台设置：

```bash
VITE_API_BASE_URL=https://your-backend-api-domain.com
```

## 第四步：测试部署

### 1. 测试后端API

```bash
# 健康检查
curl https://your-backend-api.replit.dev/health

# 获取支持的语言
curl https://your-backend-api.replit.dev/api/v1/supported-languages

# 验证PDFMathTranslate版本
curl https://your-backend-api.replit.dev/docs
```

### 2. 测试前端应用

1. 访问前端域名
2. 检查服务状态是否显示"Available"
3. 尝试上传PDF文件进行翻译

## 故障排除

### 常见问题

1. **CORS错误**
   - 确保后端API的CORS配置包含前端域名
   - 检查 `main.py` 中的 `allow_origins` 设置

2. **API连接失败**
   - 验证 `VITE_API_BASE_URL` 环境变量是否正确
   - 检查后端API是否正常运行

3. **PDFMathTranslate导入失败**
   - 确保在后端环境中正确安装了PDFMathTranslate
   - 检查是否成功切换到v2-rc分支
   - 运行 `python setup.py` 重新安装

4. **分支切换失败**
   - 确认awwaawwa/PDFMathTranslate仓库存在v2-rc分支
   - 检查网络连接和git权限
   - 脚本会在失败时使用默认分支继续

5. **文件上传失败**
   - 检查后端的文件大小限制
   - 验证临时目录权限

### 调试技巧

1. **后端调试**
   ```bash
   # 检查PDFMathTranslate安装和分支
   cd PDFMathTranslate && git branch --show-current
   
   # 查看后端日志
   # 在Replit Console中查看输出
   
   # 重新运行安装
   python setup.py
   ```

2. **前端调试**
   ```bash
   # 本地开发模式
   cd frontend-app
   npm run dev
   # 打开浏览器开发者工具查看网络请求
   ```

## PDFMathTranslate v2-rc 特性

使用v2-rc分支的优势：
- ✅ **最新功能** - 包含最新的翻译改进
- ✅ **性能优化** - 更快的处理速度
- ✅ **错误修复** - 修复了已知问题
- ✅ **API兼容性** - 与我们的后端API完全兼容

## 生产环境优化

### 后端优化

1. **性能优化**
   - 配置适当的worker数量
   - 设置请求超时时间
   - 添加请求限制

2. **安全优化**
   - 配置具体的CORS域名
   - 添加API密钥认证
   - 设置文件大小限制

### 前端优化

1. **构建优化**
   - 启用代码分割
   - 压缩静态资源
   - 配置CDN

2. **用户体验**
   - 添加加载状态
   - 错误处理优化
   - 响应式设计

## 成本考虑

### 免费方案
- **后端**: Replit.core (有使用限制)
- **前端**: Vercel/Netlify/GitHub Pages (免费额度)

### 付费方案
- **后端**: Replit Pro, AWS, Google Cloud, Azure
- **前端**: Vercel Pro, Netlify Pro, 自定义CDN

## 监控和维护

1. **健康监控**
   - 设置API健康检查
   - 监控响应时间
   - 错误日志收集

2. **更新维护**
   - 定期更新依赖
   - 跟踪PDFMathTranslate v2-rc分支更新
   - 备份重要数据
   - 性能优化

## 总结

通过这种前后端分离的架构，结合PDFMathTranslate v2-rc分支，你可以：

1. **独立部署** - 前后端可以部署到不同平台
2. **独立扩展** - 根据需要单独扩展前端或后端
3. **技术灵活性** - 可以使用不同的技术栈
4. **最新功能** - 使用PDFMathTranslate的最新改进
5. **成本优化** - 选择最适合的托管方案
6. **开发效率** - 团队可以并行开发前后端

这种架构特别适合解决Replit上的connectivity问题，因为你可以将计算密集的后端部署到更稳定的环境，而将前端部署到CDN进行快速访问。 