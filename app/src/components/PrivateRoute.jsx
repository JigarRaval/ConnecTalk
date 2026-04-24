import { Navigate } from "react-router-dom";

// Protected route wrapper – redirects to /register if no token
export const PrivateRoute = ({ element }) => {
  const token = localStorage.getItem("token");
  return token ? element : <Navigate to="/register" />;
};
