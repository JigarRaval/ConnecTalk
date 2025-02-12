import  { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Helmet } from 'react-helmet'
const url = import.meta.env.VITE_URL;

const Login = () => {
    const navigate=useNavigate()
    const[formData,setFormData]=useState({
        username:'',
        password:'',
        
    })

    const handleChange=(e)=>{
        const {name,value}=e.target;
        setFormData({
            ...formData,
            [name]:value
        })
    }
  


    const handleSubmit= async (e)=>{
       e.preventDefault();
      

      try {
        const res = await axios.post(`${url}/api/auth/login`, formData);
        localStorage.setItem('token',res.data.token)    
        navigate('/home',{state:{userId:res.data.userId,username:res.data.username,image:res.data.image}})
       }catch(err){
       console.error(
         "❌ Login failed:",
         err.response ? err.response.data : err
       );
       alert(err.response?.data?.message || "Login failed");
       }
    }
  return (
    <div className="register-container flex h-screen p-20 justify-center items-center">
      <Helmet>
        <title>ChatNest - Login</title>
      </Helmet>

      <form
        onSubmit={handleSubmit}
        className="register-form border-2 p-8 max-w-96 w-full text-center rounded-2xl "
      >
        <h1 className="app-header">ChatNest</h1>
        <h2 className="border-b-2 pb-4 text-4xl font-bold">Login</h2>
        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            autoComplete="off"
            required
          ></input>
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          ></input>
        </div>

        <button type="submit" className="register-button p-2 m-2 mb-4">
          Login
        </button>
      </form>
    </div>
  );
}

export default Login
