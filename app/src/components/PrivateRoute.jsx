import { Navigate } from "react-router-dom";

export const PrivateRoute = ({ element }) => {
  const token = localStorage.getItem("token");
  return token ? element : <Navigate to="/Register" />;
};


