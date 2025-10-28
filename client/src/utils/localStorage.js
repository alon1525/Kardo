// Utility functions for managing localStorage

/**
 * Save user's decks to localStorage
 */
export const saveDecksToStorage = (userId, decks) => {
  try {
    localStorage.setItem(`decks_${userId}`, JSON.stringify(decks));
  } catch (error) {
    console.error('Error saving decks to localStorage:', error);
  }
};

/**
 * Load user's decks from localStorage
 */
export const loadDecksFromStorage = (userId) => {
  try {
    const decksJson = localStorage.getItem(`decks_${userId}`);
    return decksJson ? JSON.parse(decksJson) : [];
  } catch (error) {
    console.error('Error loading decks from localStorage:', error);
    return [];
  }
};

/**
 * Save user's study progress to localStorage
 */
export const saveProgressToStorage = (userId, progress) => {
  try {
    localStorage.setItem(`progress_${userId}`, JSON.stringify(progress));
  } catch (error) {
    console.error('Error saving progress to localStorage:', error);
  }
};

/**
 * Load user's study progress from localStorage
 */
export const loadProgressFromStorage = (userId) => {
  try {
    const progressJson = localStorage.getItem(`progress_${userId}`);
    return progressJson ? JSON.parse(progressJson) : {};
  } catch (error) {
    console.error('Error loading progress from localStorage:', error);
    return {};
  }
};

/**
 * Save user stats to localStorage
 */
export const saveStatsToStorage = (userId, stats) => {
  try {
    localStorage.setItem(`stats_${userId}`, JSON.stringify(stats));
  } catch (error) {
    console.error('Error saving stats to localStorage:', error);
  }
};

/**
 * Load user stats from localStorage
 */
export const loadStatsFromStorage = (userId) => {
  try {
    const statsJson = localStorage.getItem(`stats_${userId}`);
    return statsJson ? JSON.parse(statsJson) : {
      cardsStudiedToday: 0,
      streak: 0,
      lastStudyDate: null
    };
  } catch (error) {
    console.error('Error loading stats from localStorage:', error);
    return {
      cardsStudiedToday: 0,
      streak: 0,
      lastStudyDate: null
    };
  }
};

