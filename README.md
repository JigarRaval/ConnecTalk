# ConnecTalk

ConnecTalk is a real-time chat application built with a **MERN stack** and **Vite** for the frontend. This repository contains both the frontend (`app` folder) and backend (`backend` folder).

## Website
You can access the live application here: [ConnecTalk](https://connectalk.onrender.com)

## Getting Started

### Prerequisites
Ensure you have the following installed before proceeding:
- **Node.js** (Latest LTS recommended)
- **MongoDB** (Locally or via a cloud service like MongoDB Atlas)
- **Git** (For cloning the repository)

### Environment Setup
To configure the project correctly, you need to set up environment variables in both the **frontend (app)** and **backend (backend)** folders.

#### 1. Add `.env` File in Both `app` and `backend`
You must create a `.env` file inside both the `app` and `backend` folders.

#### 2. Configure `.env` for `app` (Frontend)
Create a `.env` file inside the `app` folder and add the following:
```env
VITE_URL=your_backend_url_here
```
Replace `your_backend_url_here` with the actual backend URL.

#### 3. Configure `.env` for `backend`
Create a `.env` file inside the `backend` folder and add the following:
```env
HOST=your_host_here
PORT=your_port_here
JWT_SECRET=your_jwt_secret_here
MONGODB=your_mongodb_connection_string_here
```
Replace the placeholders with appropriate values:
- `HOST` - The hostname or IP address where the backend runs (e.g., `localhost` or a deployed server)
- `PORT` - The port number where the backend should run (e.g., `5000`)
- `JWT_SECRET` - A secure secret key for JWT authentication
- `MONGODB` - Your MongoDB connection string

## Running the Application

### 1. Install Dependencies
Navigate to both `app` and `backend` folders separately and run:
```sh
npm install
```

### 2. Start the Backend
Go to the `backend` folder and run:
```sh
npm start
```

### 3. Start the Frontend
Go to the `app` folder and run:
```sh
npm run dev
```

