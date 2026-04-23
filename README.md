# DocGen — AI Code Documentation Generator

A cloud-based SaaS that generates documentation from GitHub repositories or pasted code.

## Tech Stack

- **Frontend:** React (Vite) + React Router
- **Backend:** Node.js + Express
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT-based
- **Deployment:** Render

## Features

- User authentication (register/login with JWT)
- GitHub repo fetching (auto-ignores node_modules, dist, .git, etc.)
- Paste/upload code directly
- AI-powered documentation generation (mock)
- Auto-generated README.md + per-file documentation
- Dashboard with project management
- Edit and download generated docs
- Responsive dark UI

## Project Structure

```
├── backend/
│   ├── config/db.js
│   ├── middleware/auth.js
│   ├── models/
│   │   ├── User.js
│   │   └── Project.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── projects.js
│   ├── utils/
│   │   ├── github.js
│   │   └── docGenerator.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/Navbar.jsx
│   │   ├── context/AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── ProjectView.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── render.yaml
└── README.md
```

## Local Setup

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- GitHub Personal Access Token (optional, for higher API rate limits)

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd cloud
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
npm run dev
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:3000` and proxies API calls to `http://localhost:5000`.

## API Routes

| Method | Route                | Auth | Description           |
|--------|----------------------|------|-----------------------|
| POST   | /api/auth/register   | No   | Register new user     |
| POST   | /api/auth/login      | No   | Login user            |
| POST   | /api/projects/create | Yes  | Create new project    |
| GET    | /api/projects/get    | Yes  | List user's projects  |
| GET    | /api/projects/:id    | Yes  | Get project by ID     |
| PUT    | /api/projects/:id    | Yes  | Update project README |
| DELETE | /api/projects/:id    | Yes  | Delete project        |

## Deployment (Render)

1. Push to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **New → Blueprint**
4. Connect your repo and select the `render.yaml`
5. Set environment variables:
   - `MONGODB_URI` — Your MongoDB Atlas connection string
   - `GITHUB_TOKEN` — GitHub PAT (optional)
6. Deploy

The `render.yaml` configures:
- Backend as a **Web Service** (Node)
- Frontend as a **Static Site** (Vite build)

## Environment Variables

| Variable      | Required | Description                    |
|---------------|----------|--------------------------------|
| MONGODB_URI   | Yes      | MongoDB connection string      |
| JWT_SECRET    | Yes      | Secret for signing JWT tokens  |
| GITHUB_TOKEN  | No       | GitHub PAT for API rate limits |
| PORT          | No       | Backend port (default: 5000)   |
| VITE_API_URL  | No       | Backend URL for production     |

## License

MIT
