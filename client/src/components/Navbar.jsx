import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/**
 * Navigation bar component
 */
const Navbar = () => {
  const { currentUser, signout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
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
    <nav className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-gray-900 dark:to-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to={currentUser ? "/dashboard" : "/"} className="text-xl sm:text-2xl font-bold text-white hover:text-primary-100 transition-colors">
              Kardo
            </Link>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              <span className="material-icons">
                {isDark ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            {currentUser ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="text-white/90 hover:text-white px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors"
                >
                  <span className="hidden sm:inline">Dashboard</span>
                  <span className="sm:hidden">Dash</span>
                </Link>
                <Link 
                  to="/public-decks" 
                  className="text-white/90 hover:text-white px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium hidden sm:block transition-colors"
                >
                  Community Decks
                </Link>
                <span className="text-white/80 text-xs sm:text-sm hidden md:inline">
                  {currentUser.email}
                </span>
                <button 
                  onClick={handleLogout}
                  className="bg-white/20 hover:bg-white/30 text-white text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors"
                >
                  <span className="hidden sm:inline">Logout</span>
                  <span className="sm:hidden material-icons text-base">exit_to_app</span>
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-white/90 hover:text-white px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors"
                >
                  Login
                </Link>
                <Link 
                  to="/signup" 
                  className="bg-white hover:bg-primary-50 text-primary-600 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold transition-colors"
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

