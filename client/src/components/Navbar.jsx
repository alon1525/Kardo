import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Navigation bar component
 */
const Navbar = () => {
  const { currentUser, signout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Sign out first to clear the session
      await signout();
      
      // Navigate to home page
      navigate('/', { replace: true });
      
      // Force a page reload to ensure all state is cleared
      setTimeout(() => {
        window.location.href = '/';
      }, 200);
    } catch (error) {
      console.error('Error logging out:', error);
      // Still navigate and reload even if there's an error
      navigate('/', { replace: true });
      setTimeout(() => {
        window.location.href = '/';
      }, 200);
    }
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to={currentUser ? "/dashboard" : "/"} className="text-xl sm:text-2xl font-bold text-primary-600">
              Kardo
            </Link>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {currentUser ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="text-gray-700 hover:text-primary-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
                >
                  <span className="hidden sm:inline">Dashboard</span>
                  <span className="sm:hidden">Dash</span>
                </Link>
                <Link 
                  to="/public-decks" 
                  className="text-gray-700 hover:text-primary-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium hidden sm:block"
                >
                  Community Decks
                </Link>
                <span className="text-gray-600 text-xs sm:text-sm hidden md:inline">
                  {currentUser.email}
                </span>
                <button 
                  onClick={handleLogout}
                  className="btn-secondary text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2"
                >
                  <span className="hidden sm:inline">Logout</span>
                  <span className="sm:hidden material-icons text-base">exit_to_app</span>
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-gray-700 hover:text-primary-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
                >
                  Login
                </Link>
                <Link 
                  to="/signup" 
                  className="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

