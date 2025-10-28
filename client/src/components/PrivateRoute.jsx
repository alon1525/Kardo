import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Private route component that redirects to login if user is not authenticated
 */
const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;

