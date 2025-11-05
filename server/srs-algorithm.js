/**
 * Spaced Repetition System (SRS) Algorithm
 * Based on Anki-style learning steps
 */

/**
 * Review a card and update its progress based on the grade
 * @param {Object} cardProgress - Current progress object
 * @param {string} grade - "again", "hard", "good", or "easy"
 * @returns {Object} Updated progress object
 */
export function reviewCard(cardProgress, grade) {
  const now = new Date();
  
  // Initialize progress if it's null (new card for this user)
  if (!cardProgress) {
    cardProgress = {
      interval: 0,
      ease_factor: 2.5,
      repetitions: 0,
      due_date: now,
      last_review: null
    };
  }
  
  // Determine if card is in learning phase (repetitions < 2 or interval < 1 day)
  const isLearning = cardProgress.repetitions < 2 || cardProgress.interval < 1;
  
  if (grade === "again") {
    // Reset progress - start over
    cardProgress.repetitions = 0;
    
    if (isLearning) {
      // Learning step: <1m (1 minute) - first step in learning sequence
      cardProgress.interval = 1 / (24 * 60); // 1 minute in days
    } else {
      // Review card: reset to minimum learning interval (1 minute)
      // This allows the card to go back through learning steps
      cardProgress.interval = 1 / (24 * 60); // 1 minute in days (minimum interval)
    }
    
    cardProgress.ease_factor = Math.max(1.3, cardProgress.ease_factor - 0.15);
  } else {
    // Successful review
    cardProgress.repetitions += 1;
    
    if (isLearning) {
      // Learning steps for new/learning cards
      if (grade === "hard") {
        cardProgress.interval = 6 / (24 * 60); // 6 minutes in days
      } else if (grade === "good") {
        cardProgress.interval = 10 / (24 * 60); // 10 minutes in days
      } else if (grade === "easy") {
        cardProgress.interval = 3; // 3 days (graduated from learning)
      }
    } else {
      // Review cards (repetitions >= 2 and interval >= 1 day)
      // Apply ease factor adjustments BEFORE calculating interval
      if (grade === "hard") {
        cardProgress.ease_factor = Math.max(1.3, cardProgress.ease_factor - 0.15);
        // Hard: interval × 1.2 (using original ease factor, but reduced for next time)
        cardProgress.interval = Math.round(cardProgress.interval * 1.2);
      } else if (grade === "good") {
        // Good: interval × ease_factor (no change to ease factor)
        cardProgress.interval = Math.round(cardProgress.interval * cardProgress.ease_factor);
      } else if (grade === "easy") {
        cardProgress.ease_factor = cardProgress.ease_factor + 0.15;
        // Easy: interval × ease_factor × 1.3 (using increased ease factor)
        cardProgress.interval = Math.round(cardProgress.interval * cardProgress.ease_factor * 1.3);
      }
    }
  }
  
  // Calculate next due date (interval in days, convert to milliseconds)
  const nextDueDate = new Date(now.getTime() + cardProgress.interval * 24 * 60 * 60 * 1000);
  cardProgress.due_date = nextDueDate;
  cardProgress.last_review = now;
  
  return cardProgress;
}

/**
 * Calculate the next review time for a card based on a grade, without modifying progress
 * This is used to preview what the next review time would be
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
      // Learning step: <1m (1 minute)
      tempProgress.interval = 1 / (24 * 60); // 1 minute in days
    } else {
      // Review card: 1 day
      tempProgress.interval = 1;
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
      if (grade === "hard") {
        // Hard: interval × 1.2
        tempProgress.interval = Math.round(tempProgress.interval * 1.2);
        tempProgress.ease_factor = Math.max(1.3, tempProgress.ease_factor - 0.15);
      } else if (grade === "good") {
        // Good: interval × ease_factor
        tempProgress.interval = Math.round(tempProgress.interval * tempProgress.ease_factor);
        // No change to ease factor
      } else if (grade === "easy") {
        // Easy: interval × ease_factor × 1.3
        tempProgress.interval = Math.round(tempProgress.interval * tempProgress.ease_factor * 1.3);
        tempProgress.ease_factor = tempProgress.ease_factor + 0.15;
      }
      
      // Ensure minimum ease factor
      if (tempProgress.ease_factor < 1.3) {
        tempProgress.ease_factor = 1.3;
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
