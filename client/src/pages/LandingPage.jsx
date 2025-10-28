import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/**
 * Landing page with hero section, features, and call-to-action
 */
const LandingPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-500 to-primary-700 text-white py-20 flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Master Languages with Smart Flashcards
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100 max-w-3xl mx-auto">
              Learn faster with AI-powered suggestions and spaced repetition. 
              Build your vocabulary, track your progress, and achieve fluency.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup" className="btn-secondary text-lg px-8 py-3">
                Get Started Free
              </Link>
              <Link to="/login" className="bg-white/10 hover:bg-white/20 text-white border-2 border-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors">
                Sign In
              </Link>
            </div>
          </div>
          
          {/* Illustration Placeholder */}
          <div className="mt-16 flex justify-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 w-full max-w-4xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/20 rounded-lg p-6 text-center">
                  <div className="text-4xl mb-3">📚</div>
                  <h3 className="font-bold text-lg mb-2">Flashcards</h3>
                  <p className="text-sm text-primary-100">Interactive learning cards</p>
                </div>
                <div className="bg-white/20 rounded-lg p-6 text-center">
                  <div className="text-4xl mb-3">🤖</div>
                  <h3 className="font-bold text-lg mb-2">AI Powered</h3>
                  <p className="text-sm text-primary-100">Smart word suggestions</p>
                </div>
                <div className="bg-white/20 rounded-lg p-6 text-center">
                  <div className="text-4xl mb-3">📈</div>
                  <h3 className="font-bold text-lg mb-2">Track Progress</h3>
                  <p className="text-sm text-primary-100">See your improvement</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">
            Why Choose Kardo?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Spaced Repetition</h3>
              <p className="text-gray-600">
                Scientifically proven method to help you remember vocabulary longer. 
                Cards you struggle with appear more frequently.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💡</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Suggestions</h3>
              <p className="text-gray-600">
                Get personalized word recommendations based on your current level 
                and learning goals. Expand your vocabulary intelligently.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👥</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Shared Decks</h3>
              <p className="text-gray-600">
                Import and share flashcard decks with the community. 
                Learn from others and contribute your own collections.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔊</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Audio Pronunciation</h3>
              <p className="text-gray-600">
                Listen to correct pronunciation using the Web Speech API. 
                Practice speaking and improve your accent.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📱</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Responsive Design</h3>
              <p className="text-gray-600">
                Study on any device - desktop, tablet, or mobile. 
                Learn anywhere, anytime.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Progress Tracking</h3>
              <p className="text-gray-600">
                Monitor your daily progress, streaks, and identify 
                areas that need more practice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-primary-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Start Learning?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of language learners already using Kardo
          </p>
          <Link to="/signup" className="bg-white text-primary-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg text-lg transition-colors inline-block">
            Create Free Account
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;

