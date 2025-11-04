import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/**
 * Landing page with hero section, features, and call-to-action
 */
const LandingPage = () => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [flipCard, setFlipCard] = useState(false);

  // Redirect to dashboard if already logged in (only after loading is done)
  useEffect(() => {
    // Wait a bit to ensure auth state has settled after logout
    const timeoutId = setTimeout(() => {
      if (!loading && currentUser) {
        // Double-check that we actually have a valid session
        // If user was just logged out, currentUser might be null
        if (currentUser && currentUser.email) {
          navigate('/dashboard', { replace: true });
        }
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [currentUser, loading, navigate]);

  // Animate card flip
  useEffect(() => {
    const interval = setInterval(() => {
      setFlipCard(prev => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden flex-grow">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-300 dark:bg-primary-800 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-30 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-300 dark:bg-purple-800 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-300 dark:bg-pink-800 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className="text-center lg:text-left">
              <div className="inline-block mb-4">
                <span className="bg-gradient-to-r from-primary-500 to-purple-600 dark:from-primary-400 dark:to-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                  ✨ AI-Powered Learning
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-primary-600 to-purple-600 dark:from-white dark:via-primary-400 dark:to-purple-400 bg-clip-text text-transparent leading-tight">
                Master Languages<br />
                <span className="text-primary-600 dark:text-primary-400">One Card at a Time</span>
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-gray-700 dark:text-gray-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Transform your language learning with intelligent flashcards, 
                AI-powered suggestions, and spaced repetition. Make every study session count.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link 
                  to="/signup" 
                  className="group relative bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <span>Get Started Free</span>
                  <span className="material-icons group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
                <Link 
                  to="/login" 
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-500 font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Sign In
                </Link>
              </div>
            </div>

            {/* Right Column - Animated Card Demo */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md">
                {/* Floating card demo */}
                <div className="relative" style={{ perspective: '1000px' }}>
                  <div 
                    className="relative w-full h-80 transition-transform duration-700"
                    style={{ 
                      transformStyle: 'preserve-3d',
                      transform: flipCard ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                  >
                    {/* Front of card */}
                    <div 
                      className="absolute inset-0 w-full h-full rounded-2xl shadow-2xl p-8 flex items-center justify-center"
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(0deg)',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      }}
                    >
                      <div className="text-center text-white">
                        <span className="material-icons text-6xl mb-4 block">translate</span>
                        <h3 className="text-3xl font-bold mb-2">Hello</h3>
                        <p className="text-white/80 text-lg">English</p>
                      </div>
                    </div>
                    
                    {/* Back of card */}
                    <div 
                      className="absolute inset-0 w-full h-full rounded-2xl shadow-2xl p-8 flex items-center justify-center"
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                      }}
                    >
                      <div className="text-center text-white">
                        <span className="material-icons text-6xl mb-4 block">language</span>
                        <h3 className="text-3xl font-bold mb-2">Hola</h3>
                        <p className="text-white/80 text-lg">Spanish</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary-200 dark:bg-primary-800 rounded-full opacity-50 blur-2xl animate-pulse"></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-purple-200 dark:bg-purple-800 rounded-full opacity-50 blur-2xl animate-pulse animation-delay-2000"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 bg-white dark:bg-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
              Why Choose <span className="text-primary-600 dark:text-primary-400">Kardo</span>?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Everything you need to master any language, all in one place
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700">
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-icons text-white text-3xl">psychology</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">AI-Powered Suggestions</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Get intelligent word recommendations based on your learning level and goals. 
                Expand your vocabulary with contextually relevant cards.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-icons text-white text-3xl">schedule</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Spaced Repetition</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Scientifically proven method that helps you remember longer. 
                Cards you struggle with appear more frequently until you master them.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700">
              <div className="bg-gradient-to-br from-pink-500 to-pink-600 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-icons text-white text-3xl">people</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Community Decks</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Share and discover flashcard decks with learners worldwide. 
                Learn from others and contribute your own collections.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-icons text-white text-3xl">record_voice_over</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Rich Text Editing</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Create beautiful cards with formatting, alignment options, and customizable fonts. 
                Make your flashcards visually engaging.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700">
              <div className="bg-gradient-to-br from-green-500 to-green-600 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-icons text-white text-3xl">devices</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Fully Responsive</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Study on any device - desktop, tablet, or mobile. 
                Your progress syncs seamlessly across all devices.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-icons text-white text-3xl">insights</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Progress Tracking</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Monitor your daily progress, track streaks, and identify areas 
                that need more practice with detailed analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Get started in minutes and begin your language learning journey
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-white text-3xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Create Your Deck</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Start by creating a deck for your target language. 
                Choose from dozens of supported languages.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-white text-3xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Add Cards</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Create flashcards manually or use AI suggestions to quickly 
                build your vocabulary collection.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-pink-500 to-pink-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-white text-3xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Practice & Learn</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Study with interactive flashcards, track your progress, 
                and watch your language skills improve over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 md:py-32 bg-gradient-to-r from-primary-600 via-primary-700 to-purple-600 dark:from-primary-800 dark:via-primary-900 dark:to-purple-900 text-white relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Start Learning?
          </h2>
          <p className="text-xl md:text-2xl text-primary-100 dark:text-primary-200 mb-10">
            Join thousands of language learners already using Kardo
          </p>
          <Link 
            to="/signup" 
            className="inline-block bg-white text-primary-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 font-semibold py-4 px-10 rounded-xl text-lg transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
