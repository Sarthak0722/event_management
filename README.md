# MERN Conference App

A full-stack web application for managing academic conferences, built with the MERN stack (MongoDB, Express.js, React, Node.js). The application allows presenters to submit papers and book presentation slots, while attendees can view and register for presentations.

## 🌟 Live Demo

- Frontend: [https://confpict.netlify.app](https://confpict.netlify.app)
- Backend: [https://conference-app-backend-7295.onrender.com](https://conference-app-backend-7295.onrender.com)

## ✨ Features

### For Presenters
- Submit and manage academic papers
- View paper details and status
- Book presentation slots
- Select preferred time slots and rooms
- Update paper information

### For Attendees
- Browse available presentations
- Register for presentations
- View scheduled presentations
- Search and filter papers by domain

### Authentication & Authorization
- User registration and login
- Role-based access control (Presenter/Attendee)
- Secure authentication using JWT
- Protected routes and API endpoints

## 🛠️ Tech Stack

### Frontend
- React.js with TypeScript
- Material-UI (MUI) for UI components
- React Router for navigation
- Axios for API calls
- Context API for state management

### Backend
- Node.js & Express.js
- MongoDB with Mongoose
- JWT for authentication
- CORS enabled
- RESTful API architecture

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Git

### Installation

1. Clone the repository
```bash
git clone https://github.com/Sarthak0722/event_management.git
cd mern-conference-app
```

2. Install Backend Dependencies
```bash
cd backend
npm install
```

3. Set up Backend Environment Variables
Create a `.env` file in the backend directory:
```env
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
PORT=5000
```

4. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

5. Set up Frontend Environment Variables
Create a `.env` file in the frontend directory:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### Running the Application

1. Start the Backend Server
```bash
cd backend
npm start
```

2. Start the Frontend Development Server
```bash
cd frontend
npm start
```

The application will be available at `http://localhost:3000`

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Papers
- `GET /api/papers` - Get all papers
- `POST /api/papers` - Submit a new paper
- `GET /api/papers/:id` - Get paper by ID
- `PUT /api/papers/:id` - Update paper
- `DELETE /api/papers/:id` - Delete paper

## 🌐 Deployment

### Frontend (Netlify)
1. Connect your GitHub repository to Netlify
2. Set build command: `cd frontend && npm install && npm run build`
3. Set environment variables in Netlify dashboard
4. Enable automatic deployments

### Backend (Render)
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set build command: `cd backend && npm install`
4. Set start command: `cd backend && node server.js`
5. Add environment variables in Render dashboard

## 🔒 Security Features

- JWT-based authentication
- Password hashing
- Protected API endpoints
- CORS configuration
- Request validation
- Error handling

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- Sarthak Kalyankar - Initial work

## 🙏 Acknowledgments

- Thanks to all contributors who helped with the project
- Special thanks to the MERN stack community
- Material-UI team for the awesome component library 