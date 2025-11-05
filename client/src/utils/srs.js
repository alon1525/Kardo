/**
 * Client-side SRS utility functions
 * Mirrors the server-side algorithm for previewing next review times
 */

/**
 * Calculate the next review time for a card based on a grade, without modifying progress
 * @param {Object} cardProgress - Current progress object (can be null for new cards)
 * @param {string} grade - "again", "hard", "good", or "easy"
 * @returns {Object} Object with nextDueDate and interval
 */
export function calculateNextReviewTime(cardProgress, grade) {
  const now = new Date();
  
  // Initialize progress if it doesn't exist (new card)
  let tempProgress = cardProgress ? { ...cardProgress } : {
    interval: 0,
    ease_factor: 2.5,
    repetitions: 0,
    due_date: now,
    last_review: null
  };
  
  // Determine if card is in learning phase (repetitions < 2 or interval < 1 day)
  const isLearning = tempProgress.repetitions < 2 || tempProgress.interval < 1;
  
  // Apply the same logic as reviewCard but don't modify the original
  if (grade === "again") {
    tempProgress.repetitions = 0;
    
    if (isLearning) {
      // Learning step: <1m (1 minute) - first step in learning sequence
      tempProgress.interval = 1 / (24 * 60); // 1 minute in days
    } else {
      // Review card: reset to minimum learning interval (1 minute)
      // This allows the card to go back through learning steps
      tempProgress.interval = 1 / (24 * 60); // 1 minute in days (minimum interval)
    }
    
    tempProgress.ease_factor = Math.max(1.3, tempProgress.ease_factor - 0.15);
  } else {
    // Successful review
    tempProgress.repetitions += 1;
    
    if (isLearning) {
      // Learning steps for new/learning cards
      if (grade === "hard") {
        tempProgress.interval = 6 / (24 * 60); // 6 minutes in days
      } else if (grade === "good") {
        tempProgress.interval = 10 / (24 * 60); // 10 minutes in days
      } else if (grade === "easy") {
        tempProgress.interval = 3; // 3 days (graduated from learning)
      }
    } else {
      // Review cards (repetitions >= 2 and interval >= 1 day)
      // For preview, use current ease_factor for calculation, then adjust for display
      const originalEaseFactor = tempProgress.ease_factor;
      
      if (grade === "hard") {
        // Hard: interval × 1.2 (using current ease_factor, but ease_factor decreases for next time)
        tempProgress.interval = Math.round(tempProgress.interval * 1.2);
        tempProgress.ease_factor = Math.max(1.3, tempProgress.ease_factor - 0.15);
      } else if (grade === "good") {
        // Good: interval × ease_factor (no change to ease factor)
        tempProgress.interval = Math.round(tempProgress.interval * tempProgress.ease_factor);
      } else if (grade === "easy") {
        // Easy: interval × ease_factor × 1.3 (using current ease_factor, then increase for next time)
        tempProgress.interval = Math.round(tempProgress.interval * tempProgress.ease_factor * 1.3);
        tempProgress.ease_factor = tempProgress.ease_factor + 0.15;
      }
    }
  }
  
  // Calculate next due date (interval in days, convert to milliseconds)
  const nextDueDate = new Date(now.getTime() + tempProgress.interval * 24 * 60 * 60 * 1000);
  
  return {
    nextDueDate,
    interval: tempProgress.interval
  };
}

/**
 * Format the next review time for display
 * @param {Date} date - The next review date
 * @returns {string} Formatted string
 */
export function formatNextReviewTime(date) {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  // Show minutes for learning steps (< 1 hour)
  if (diffDays === 0 && diffHours === 0) {
    if (diffMinutes > 0) {
      return diffMinutes === 1 ? '1m' : `${diffMinutes}m`;
    } else if (diffSeconds > 0) {
      return '<1m';
    } else {
      return 'Now';
    }
  } else if (diffDays === 0 && diffHours > 0) {
    return diffHours === 1 ? '1h' : `${diffHours}h`;
  } else if (diffDays > 0) {
    if (diffDays === 1) {
      return '1d';
    } else if (diffDays < 7) {
      return `${diffDays}d`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? '1w' : `${weeks}w`;
    } else {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? '1mo' : `${months}mo`;
    }
  } else {
    return 'Now';
  }
}

