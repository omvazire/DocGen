# 🚀 DocGen — AI Powered Code Documentation Generator

DocGen is a cloud-based SaaS application that automatically generates clean and structured documentation from GitHub repositories or pasted source code.

Built to simplify developer workflows by turning raw code into readable project documentation with an intuitive dashboard and modern UI.

---

## 🌐 Live Demo

👉 https://docgen-frontend-tvbl.onrender.com/

---

## ✨ Features

* 🔐 JWT Authentication System
* 📂 Import GitHub Repositories
* 🧠 AI-Based Documentation Generation
* 📝 Auto README.md Creation
* 📄 Per-File Documentation Support
* 📋 Paste or Upload Custom Code
* 📊 Project Dashboard Management
* ✏️ Edit Generated Documentation
* ⬇️ Download Documentation Files
* 🌙 Responsive Modern Dark UI
* 🚫 Auto-Ignores Unnecessary Files

  * `node_modules`
  * `.git`
  * `dist`
  * `build`
  * etc.

---

## 🛠️ Tech Stack

### Frontend

* React (Vite)
* React Router DOM
* Context API

### Backend

* Node.js
* Express.js

### Database

* MongoDB
* Mongoose

### Authentication

* JWT (JSON Web Tokens)

### Deployment

* Render

---

## 📁 Project Structure

```bash
DocGen/
│
├── backend/
│   ├── config/
│   │   └── db.js
│   │
│   ├── middleware/
│   │   └── auth.js
│   │
│   ├── models/
│   │   ├── User.js
│   │   └── Project.js
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   └── projects.js
│   │
│   ├── utils/
│   │   ├── github.js
│   │   └── docGenerator.js
│   │
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.jsx
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── ProjectView.jsx
│   │   │
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── vite.config.js
│   └── package.json
│
├── render.yaml
└── README.md
```

---

## ⚙️ Local Setup

### Prerequisites

Make sure you have installed:

* Node.js (v18+)
* MongoDB Atlas or Local MongoDB
* GitHub Personal Access Token (Optional)

---

## 1️⃣ Clone Repository

```bash
git clone <your-repository-url>
cd DocGen
```

---

## 2️⃣ Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside backend directory:

```env
MONGODB_URI=your_mongodb_connection
JWT_SECRET=your_secret_key
GITHUB_TOKEN=your_github_token_optional
PORT=5000
```

Run backend server:

```bash
npm run dev
```

---

## 3️⃣ Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```bash
http://localhost:3000
```

Backend runs on:

```bash
http://localhost:5000
```

---

## 📡 API Routes

| Method | Route                  | Protected | Description        |
| ------ | ---------------------- | --------- | ------------------ |
| POST   | `/api/auth/register`   | ❌         | Register User      |
| POST   | `/api/auth/login`      | ❌         | Login User         |
| POST   | `/api/projects/create` | ✅         | Create Project     |
| GET    | `/api/projects/get`    | ✅         | Get All Projects   |
| GET    | `/api/projects/:id`    | ✅         | Get Single Project |
| PUT    | `/api/projects/:id`    | ✅         | Update README      |
| DELETE | `/api/projects/:id`    | ✅         | Delete Project     |

---

## 🚀 Deployment

The project is deployed using Render.

### Deployment Services

* Backend → Render Web Service
* Frontend → Render Static Site

### Environment Variables

| Variable       | Description                 |
| -------------- | --------------------------- |
| `MONGODB_URI`  | MongoDB Connection String   |
| `JWT_SECRET`   | JWT Secret Key              |
| `GITHUB_TOKEN` | GitHub API Token (Optional) |
| `PORT`         | Backend Port                |
| `VITE_API_URL` | Production Backend URL      |

---

## 🎯 Future Improvements

* Real AI integration using LLM APIs
* Multiple documentation templates
* Export as PDF / Markdown
* Team collaboration support
* GitHub OAuth Login
* Syntax highlighted documentation
* Code summarization improvements

---

## 👨‍💻 Author

Developed by Om Prabhakar Vazire

