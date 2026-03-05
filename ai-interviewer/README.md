# AI 智能面试官系统

基于阿里云百炼平台构建的 AI 模拟面试系统。用户上传简历后，系统扮演面试官角色进行多轮对话面试。

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **后端**: Python FastAPI
- **AI**: 阿里云百炼 (DashScope SDK)
- **部署**: Docker Compose

## 功能特性

- 📄 简历上传解析 (PDF/Word)
- 💬 多轮对话面试
- 🔄 模型切换 (Turbo/Plus/Max)
- ⌨️ 流式打字机效果
- 📱 响应式 UI

## 快速开始

### 前置要求

- Docker + Docker Compose
- 阿里云百炼 API Key

### 配置步骤

1. **获取 API Key**

   访问 [阿里云百炼控制台](https://dashscope.console.aliyun.com/) 获取 API Key

2. **配置环境变量**

   ```bash
   cp backend/.env.example backend/.env
   # 编辑 .env 文件，填入您的 API Key
   ```

3. **启动服务**

   ```bash
   docker-compose up -d
   ```

4. **访问应用**

   - 前端: http://localhost:3000
   - 后端 API: http://localhost:8000

### 本地开发

**后端:**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# 编辑 .env 填入 API Key
uvicorn main:app --reload
```

**前端:**
```bash
cd frontend
npm install
npm run dev
```

## API 接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/upload | 上传简历 |
| POST | /api/chat | 流式对话 |
| GET | /api/models | 获取模型列表 |
| GET | /health | 健康检查 |

## 项目结构

```
ai-interviewer/
├── backend/
│   ├── app/
│   │   ├── routes/      # API 路由
│   │   ├── services/    # 业务逻辑
│   │   └── utils/       # 工具函数
│   ├── main.py          # 应用入口
│   ├── requirements.txt # 依赖
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/  # React 组件
│   │   ├── store/       # 状态管理
│   │   └── types/       # 类型定义
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## 许可证

MIT