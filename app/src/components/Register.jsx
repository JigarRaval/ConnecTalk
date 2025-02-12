import {Helmet} from "react-helmet"
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
const url = import.meta.env.VITE_URL;
const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    image: null,
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setError("");
  };
  const handleFileChange = (e) => {
    setFormData({
      ...formData,
      image: e.target.files[0],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("username", formData.username);
    data.append("password", formData.password);
    data.append("image", formData.image);

    try {
      const res = await axios.post(`${url}/api/auth/register`, data);
      navigate("/login");
    } catch (err) {
      if (err.response && err.response.status === 400) {
        setError("Username already taken");
      } else {
        setError("Something went wrong. Please try again")
      }
    }
  };
  const handleNavigate = () => {
    navigate("/login");
  };
  return (
    <div className="register-container flex h-screen p-20 justify-center items-center ">
      <Helmet>
        <title>ChatNest - Register</title>
      </Helmet>

      <form
        onSubmit={handleSubmit}
        className=" register-form border-2 p-8 max-w-96 w-full text-center rounded-2xl   "
      >
        <h1 className="app-header">ChatNest</h1>
        <h2 className="border-b-2 pb-4 text-4xl font-bold ">Register</h2>
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
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            minLength={8}
            maxLength={16}
            pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,16}"
            title="Password must be 8-16 characters long, with at least one uppercase letter, one lowercase letter, one digit, and one special character."
            value={formData.password}
            onChange={handleChange}
            required
          ></input>
        </div>
        <div className="form-group">
          <label htmlFor="image">Upload Image:</label>
          <input
            type="file"
            id="image"
            name="image"
            onChange={handleFileChange}
            className="text-center imgselect"
            required
          ></input>
        </div>
        <button type="submit" className="register-button p-2 m-2 mb-4">
          Register
        </button>
        <p className="font-bold">
          Already have an account?
          <button
            onClick={handleNavigate}
            className="login-btn p-2 ml-4 font-normal"
          >
            Login
          </button>
        </p>
      </form>
    </div>
  );
};

export default Register;
