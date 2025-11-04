import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { createDeck, addCard } from '../api/decks';

/**
 * Public decks page - browse and search community decks
 */
const PublicDecks = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [filteredDecks, setFilteredDecks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicDecks();
  }, []);

  useEffect(() => {
    if (decks.length > 0 || loading === false) {
      filterDecks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterLanguage]);

  const fetchPublicDecks = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/public-decks');
      if (!response.ok) {
        throw new Error('Failed to fetch public decks');
      }
      const data = await response.json();
      setDecks(data || []);
      setFilteredDecks(data || []);
    } catch (error) {
      console.error('Error fetching public decks:', error);
      // If API fails, use empty array
      setDecks([]);
      setFilteredDecks([]);
    } finally {
      setLoading(false);
    }
  };

  const filterDecks = () => {
    let filtered = decks;

    // Filter by search term (searches in name and description)
    if (searchTerm) {
      filtered = filtered.filter(deck => 
        deck.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deck.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by language
    if (filterLanguage !== 'all') {
      filtered = filtered.filter(deck => deck.language === filterLanguage);
    }

    // Sort by download count (most downloaded first)
    filtered.sort((a, b) => b.download_count - a.download_count);

    setFilteredDecks(filtered);
  };

  const handleDownloadDeck = async (deckId) => {
    try {
      // First, download the deck (increments download count)
      const response = await fetch(`http://localhost:5000/api/decks/${deckId}/download`, {
        method: 'POST'
      });
      const downloadedDeck = await response.json();
      
      if (!currentUser) {
        alert('Please log in to download decks');
        return;
      }
      
      const userId = currentUser?.id || currentUser?.uid || currentUser?.email;
      
      const userEmail = currentUser?.email || null;
      // Create a new deck for the user with the downloaded deck's cards
      const newDeck = await createDeck(userId, {
        name: `${downloadedDeck.name} (Downloaded)`,
        description: downloadedDeck.description || 'Downloaded from community',
        language: downloadedDeck.language,
        isPublic: false // Downloaded decks become private
      }, userEmail);
      
      // Add all cards from the downloaded deck to the new deck
      if (downloadedDeck.cards && Array.isArray(downloadedDeck.cards) && downloadedDeck.cards.length > 0) {
        for (const card of downloadedDeck.cards) {
          await addCard(newDeck.id, {
            front: card.front || { content: card.front?.content || '' },
            back: card.back || { content: card.back?.content || '' },
            difficulty: card.difficulty || 'medium'
          });
        }
      }
      
      alert('Deck downloaded successfully! Redirecting to dashboard...');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error downloading deck:', error);
      alert('Error downloading deck. Please try again.');
    }
  };

  const languages = [...new Set(decks.map(deck => deck.language))];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
      <Navbar />
      
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Community Decks</h1>
          <p className="text-gray-600 dark:text-gray-300">Discover and download decks shared by the community</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <span className="material-icons absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">search</span>
              <input
                type="text"
                placeholder="Search decks by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400"
              />
            </div>
            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Languages</option>
              {languages.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <span className="material-icons text-6xl text-gray-400 dark:text-gray-500 animate-spin">refresh</span>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading public decks...</p>
          </div>
        ) : filteredDecks.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
            <span className="material-icons text-6xl text-gray-400 dark:text-gray-500 mb-4">search_off</span>
            <h3 className="text-xl font-semibold mb-2 dark:text-white">No decks found</h3>
            <p className="text-gray-600 dark:text-gray-300">
              {searchTerm ? 'Try a different search term' : 'No public decks available yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDecks.map(deck => (
              <div
                key={deck.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all border-2 border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 p-6 transform hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{deck.name}</h3>
                  <span className="text-xs bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 text-white px-3 py-1 rounded-full font-semibold shadow-sm">
                    {deck.language}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{deck.description}</p>
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <span className="flex items-center gap-1 min-w-[100px]">
                    <span className="material-icons text-base">description</span>
                    <span className="inline-block min-w-[60px]">{deck.card_count || 0} cards</span>
                  </span>
                  <span className="flex items-center gap-1 min-w-[120px]">
                    <span className="material-icons text-base">download</span>
                    <span className="inline-block min-w-[70px]">{deck.download_count || 0} downloads</span>
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleDownloadDeck(deck.id)}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <span className="material-icons text-lg">download</span>
                    Download Deck
                  </button>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    by {deck.creator_email}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default PublicDecks;

