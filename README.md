# Gapi - Full Stack Application

A full-stack application with Node.js Express backend and React frontend.

## Project Structure

```
Gapi/
├── backend/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Getting Started

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

## Running the Application

### Development Mode (Recommended)

**Terminal 1 - Start Backend:**
```bash
cd backend
npm run dev
```
Backend will run on http://localhost:5000

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm run dev
```
Frontend will run on http://localhost:3000

### Production Mode

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Start the backend (which will serve the built frontend):
```bash
cd backend
npm start
```
Application will be available at http://localhost:5000

## API Endpoints

- `GET /api/health` - Check if backend is running
- `GET /api/data` - Get sample data
- `POST /api/data` - Create new item

## Features

- Express.js backend with CORS support
- React frontend with Vite
- Proxy configuration for API calls
- Sample CRUD operations
- Modern UI with gradients and animations
