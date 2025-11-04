import { Link } from 'react-router-dom';

/**
 * Footer component
 */
const Footer = () => {
  return (
    <footer className="bg-gray-800 dark:bg-gray-900 text-white transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold mb-4">Kardo</h3>
            <p className="text-gray-400 dark:text-gray-500">
              Master any language with smart flashcards and AI-powered learning.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-gray-400 dark:text-gray-500">
              <li><Link to="/features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link to="/public-decks" className="hover:text-white transition-colors">Browse Decks</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-gray-400 dark:text-gray-500">
              <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 dark:border-gray-800 mt-8 pt-8 text-center text-gray-400 dark:text-gray-500">
          <p>&copy; 2024 Kardo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

