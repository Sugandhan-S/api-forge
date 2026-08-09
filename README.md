# ⚡ APIForge — Visual API Designer & Mock Engine

> Design, mock, test, and document production-ready APIs visually with real-time collaboration and AI assistance.

![APIForge Architecture](https://img.shields.io/badge/Architecture-Monorepo-6c63ff)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![React](https://img.shields.io/badge/React-19.x-61dafb)
![Express](https://img.shields.io/badge/Express-5.x-black)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🌟 Overview

**APIForge** is an open-source visual API design workspace. It bridges the gap between visual architecture planning and API execution by allowing software engineers and technical teams to design endpoints, attach database schemas, configure security models, and instantly spin up live mock servers — all within an interactive node-based canvas.

### Key Features

- 🎨 **Visual Node-Based Canvas**: Drag and drop Endpoint, Database/Schema, and Authentication nodes using React Flow.
- 📋 **OpenAPI 3.0.3 Spec Generator**: Real-time bidirectional conversion between visual node AST and valid OpenAPI YAML/JSON specs.
- 🧪 **Instant Mock Server**: Live Express mock engine with intelligent schema-based data generation (`schemaFaker`) and latency simulation.
- 🤖 **AI Assistant**: Automated endpoint descriptions, request body generation, test suite synthesis, and static API design issue detection.
- 👥 **Real-Time Collaboration**: Multi-user cursor tracking and canvas synchronization powered by Socket.IO.
- 📦 **Multi-Format Export**: Export specs directly to OpenAPI 3.0 (YAML/JSON), Postman Collection v2.1, Markdown documentation, or view live in Swagger UI.
- 🔐 **Persistence & Auth**: Cloud saving with Supabase (PostgreSQL + RLS) with automatic Guest Mode fallback to `localStorage`.

---

## 🏗️ Repository Architecture

APIForge is organized as a lightweight monorepo:

```text
api-forge/
├── frontend/             # React 19 + TypeScript + Vite + React Flow UI
│   ├── src/
│   │   ├── components/   # UI panels (AIPanel, SpecViewer, MockPanel, ExportPanel)
│   │   ├── generators/   # AST builder, OpenAPI generator, Postman collection builder
│   │   ├── hooks/        # Auth, Collaboration, Mock server, and Project state hooks
│   │   ├── inspector/    # Node properties inspectors
│   │   ├── nodes/        # React Flow custom node components (Endpoint, DB, Auth)
│   │   └── stores/       # Zustand canvas state store
│   └── package.json
├── backend/              # Node.js + Express 5 + Socket.IO server
│   ├── src/
│   │   ├── ai/           # Gemini / OpenAI API integration & template fallbacks
│   │   ├── mock/         # In-memory Express router generator & schema faker
│   │   ├── routes/       # OpenAPI, Mock, AI, and Swagger UI doc endpoints
│   │   └── websocket/    # Socket.IO room collaboration handlers
│   └── package.json
├── .gitignore            # Root Git ignore rules
├── .env.example          # Template environment configurations
├── LICENSE               # MIT License
└── README.md             # Project documentation
```

---

## 🚀 Quick Start & Local Setup

### Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/YOUR_USERNAME/api-forge.git
cd api-forge

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Setup

Copy `.env.example` files to `.env` in both `backend` and `frontend` directories:

```bash
# Backend environment setup
cd ../backend
cp .env.example .env

# Frontend environment setup
cd ../frontend
cp .env.example .env
```

> **Note:** The default values in `.env` are configured out-of-the-box for local development on `http://localhost:5173` (Frontend) and `http://localhost:3001` (Backend).

### 3. Run the Development Servers

Open two terminal windows:

```bash
# Terminal 1 — Backend Express Server
cd backend
npm run dev

# Terminal 2 — Frontend Vite Application
cd frontend
npm run dev
```

Visit **`http://localhost:5173`** in your browser to launch APIForge.

---

## 💻 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, `@xyflow/react` (React Flow), Zustand, Lucide React, Socket.IO Client, `@supabase/supabase-js`.
- **Backend**: Node.js, Express 5, TypeScript, Socket.IO, `swagger-ui-dist`, `js-yaml`, OpenAI SDK (Gemini/OpenAI compliant).
- **Tooling**: Oxlint, tsx, Vite.

---

## 🚢 Deployment Strategy

For hosting a production or portfolio instance of APIForge:

- **Frontend**: Deploy `frontend/` on **Vercel** or **Netlify** (Static SPA with Client-Side Routing).
- **Backend**: Deploy `backend/` on **Render**, **Railway**, or **Fly.io** (Requires a persistent server for WebSocket collaboration & mock server state).
- **Database**: **Supabase** PostgreSQL instance for cloud project persistence and user authentication.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
