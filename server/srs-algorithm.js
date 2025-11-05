/**
 * Spaced Repetition System (SRS) Algorithm
 * Based on the user's requirements
 */

/**
 * Review a card and update its progress based on the grade
 * @param {Object} cardProgress - Current progress object
 * @param {string} grade - "again", "hard", "good", or "easy"
 * @returns {Object} Updated progress object
 */
export function reviewCard(cardProgress, grade) {
  const now = new Date();
  
  // Initialize progress if it doesn't exist
  if (!cardProgress) {
    cardProgress = {
      interval: 0,
      ease_factor: 2.5,
      repetitions: 0,
      due_date: now,
      last_review: null
    };
  }
  
  if (grade === "again") {
    // Reset progress - start over
    cardProgress.repetitions = 0;
    cardProgress.interval = 1; // Review again in 1 day
    cardProgress.ease_factor = Math.max(1.3, cardProgress.ease_factor - 0.15); // Slight decrease
  } else {
    // Successful review
    cardProgress.repetitions += 1;
    
    // Set initial intervals based on repetitions
    if (cardProgress.repetitions === 1) {
      cardProgress.interval = 1; // 1 day
    } else if (cardProgress.repetitions === 2) {
      cardProgress.interval = 6; // 6 days
    } else {
      // Calculate new interval based on ease factor
      cardProgress.interval = Math.round(cardProgress.interval * cardProgress.ease_factor);
    }
    
    // Adjust ease factor based on grade
    if (grade === "hard") {
      cardProgress.ease_factor -= 0.15;
    } else if (grade === "good") {
      // No change to ease factor
      cardProgress.ease_factor += 0;
    } else if (grade === "easy") {
      cardProgress.ease_factor += 0.15;
    }
    
    // Ensure minimum ease factor
    if (cardProgress.ease_factor < 1.3) {
      cardProgress.ease_factor = 1.3;
    }
  }
  
  // Calculate next due date (interval in days)
  const nextDueDate = new Date(now.getTime() + cardProgress.interval * 24 * 60 * 60 * 1000);
  cardProgress.due_date = nextDueDate;
  cardProgress.last_review = now;
  
  return cardProgress;
}

