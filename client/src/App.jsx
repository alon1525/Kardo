import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import DeckPage from './pages/DeckPage';
import PublicDecks from './pages/PublicDecks';
import PrivateRoute from './components/PrivateRoute';

// Redirect authenticated users away from auth pages
function RedirectIfAuthenticated({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? <Navigate to="/dashboard" replace /> : children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/login"
            element={
              <RedirectIfAuthenticated>
                <Login />
              </RedirectIfAuthenticated>
            }
          />
          <Route
            path="/signup"
            element={
              <RedirectIfAuthenticated>
                <SignUp />
              </RedirectIfAuthenticated>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/deck/:deckId"
            element={
              <PrivateRoute>
                <DeckPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/public-decks"
            element={
              <PrivateRoute>
                <PublicDecks />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

