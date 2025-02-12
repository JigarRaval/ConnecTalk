import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Register from './components/Register'
import Login from './components/Login'
import Home from './components/Home'
import './App.css';
import { PrivateRoute } from './components/PrivateRoute';
const App = () => {
  // const token = localStorage.getItem("token");
  return (
    <Router>
      <Routes>
        {/* <Route path="/" element={!token ? <Navigate to="/register" /> : <Navigate to="/home" />} /> */}
        <Route path="/" element={<Register/>} />
        <Route path="/register" element={<Register/>} />
        <Route path="/login" element={<Login/>} />
        <Route path="/home" element={<PrivateRoute element={<Home />} />}/>
      </Routes>
    </Router>
  )
}

export default App
