import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/**
 * Sign up page component
 */
const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    if (!signup || typeof signup !== 'function') {
      setError('Authentication service is not available. Please check your Supabase configuration and refresh the page.');
      console.error('signup is not a function:', typeof signup, signup);
      return;
    }

    try {
      setError('');
      setLoading(true);
      const response = await signup(email, password);
      
      // Check if user needs to confirm email
      if (response.user && !response.session) {
        setSuccess(true);
        console.log('Signup successful - email confirmation required');
      } else if (response.session) {
        // Auto-logged in (email confirmation disabled)
        console.log('Signup successful - auto-logged in');
        navigate('/dashboard', { replace: true });
      } else {
        // Shouldn't happen, but handle it
        setSuccess(true);
      }
    } catch (err) {
      console.error('Signup error caught:', err);
      const errorMessage = err.message || err.error?.message || 'Failed to create account';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
      <Navbar />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-300 dark:bg-primary-800 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-300 dark:bg-purple-800 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-300 dark:bg-pink-800 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-md w-full">
          {/* Welcome Section */}
          <div className="text-center mb-8 px-2">
            <div className="inline-block mb-4">
              <span className="bg-gradient-to-r from-primary-500 to-purple-600 dark:from-primary-400 dark:to-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                Start Learning Today! 🚀
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-gray-900 via-primary-600 to-purple-600 dark:from-white dark:via-primary-400 dark:to-purple-400 bg-clip-text text-transparent leading-tight pb-2">
              Create Account
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Join thousands of learners mastering languages with Kardo
            </p>
          </div>

          {/* Sign Up Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
            {success && (
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-4 rounded-lg mb-6" role="alert">
                <div className="flex items-start gap-3">
                  <span className="material-icons text-green-600 dark:text-green-400">check_circle</span>
                  <div>
                    <strong className="font-bold block mb-1">✓ Account created successfully!</strong>
                    <p className="text-sm">Please check your email ({email}) for a confirmation link to activate your account.</p>
                  </div>
                </div>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6 flex items-center gap-2" role="alert">
                <span className="material-icons text-base">error</span>
                <span>{error}</span>
              </div>
            )}
            
            {!success && (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Email address
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">
                        <span className="material-icons text-xl">email</span>
                      </span>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="appearance-none block w-full pl-12 pr-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">
                        <span className="material-icons text-xl">lock</span>
                      </span>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="appearance-none block w-full pl-12 pr-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        placeholder="Create a strong password"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Use at least 6 characters
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">
                        <span className="material-icons text-xl">lock_outline</span>
                      </span>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="appearance-none block w-full pl-12 pr-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        placeholder="Confirm your password"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 hover:from-primary-600 hover:to-primary-700 dark:hover:from-primary-700 dark:hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <span className="material-icons animate-spin">refresh</span>
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <span className="material-icons group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              {success ? (
                <Link 
                  to="/login" 
                  className="inline-block bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 hover:from-primary-600 hover:to-primary-700 dark:hover:from-primary-700 dark:hover:to-primary-800 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Go to Sign In
                </Link>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Already have an account?{' '}
                  <Link to="/login" className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
                    Sign in
                  </Link>
                </p>
              )}
            </div>
          </div>

          {/* Features Preview */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-3 border border-gray-200 dark:border-gray-700">
              <span className="material-icons text-primary-600 dark:text-primary-400 text-2xl mb-1 block">psychology</span>
              <p className="text-xs text-gray-600 dark:text-gray-400">AI Powered</p>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-3 border border-gray-200 dark:border-gray-700">
              <span className="material-icons text-primary-600 dark:text-primary-400 text-2xl mb-1 block">schedule</span>
              <p className="text-xs text-gray-600 dark:text-gray-400">Smart Learning</p>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-3 border border-gray-200 dark:border-gray-700">
              <span className="material-icons text-primary-600 dark:text-primary-400 text-2xl mb-1 block">insights</span>
              <p className="text-xs text-gray-600 dark:text-gray-400">Track Progress</p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Secure signup powered by Supabase
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SignUp;
