/**
 * Spaced Repetition System (SRS) Algorithm
 * Full Anki-style implementation with learning steps queues
 */

import { parseLearningSteps, getDefaultSettings } from './user-settings.js';

/**
 * Get learning steps queue for a card
 * @param {Object} userSettings - User settings object
 * @returns {number[]} Array of intervals in days
 */
function getLearningSteps(userSettings) {
  if (!userSettings || !userSettings.learning_steps) {
    return parseLearningSteps(getDefaultSettings().learning_steps);
  }
  return parseLearningSteps(userSettings.learning_steps);
}

/**
 * Review a card and update its progress based on the grade
 * @param {Object} cardProgress - Current progress object
 * @param {string} grade - "again", "hard", "good", or "easy"
 * @param {Object} userSettings - User settings (optional, uses defaults if not provided)
 * @returns {Object} Updated progress object
 */
export function reviewCard(cardProgress, grade, userSettings = null) {
  const now = new Date();
  const settings = userSettings || getDefaultSettings();
  const learningSteps = getLearningSteps(settings);
  
  // Initialize progress if it's null (new card for this user)
  if (!cardProgress) {
    cardProgress = {
      interval: 0,
      ease_factor: settings.starting_ease_factor,
      repetitions: 0,
      due_date: now,
      last_review: null,
      learning_step: 0  // Start at first learning step
    };
  }
  
  // Determine if card is in learning phase
  // Card is learning if: learning_step >= 0 (not graduated) OR interval < 1 day
  const isLearning = (cardProgress.learning_step !== undefined && cardProgress.learning_step >= 0) 
                     || cardProgress.interval < 1;
  
  // If learning_step is undefined, infer from interval
  if (cardProgress.learning_step === undefined) {
    // Legacy cards: if interval < 1 day, treat as learning
    if (cardProgress.interval < 1) {
      // Find closest learning step
      const currentInterval = cardProgress.interval;
      let closestStep = 0;
      for (let i = 0; i < learningSteps.length; i++) {
        if (Math.abs(currentInterval - learningSteps[i]) < Math.abs(currentInterval - learningSteps[closestStep])) {
          closestStep = i;
        }
      }
      cardProgress.learning_step = closestStep;
    } else {
      // Graduated card
      cardProgress.learning_step = -1;
    }
  }
  
  if (grade === "again") {
    // Reset to first learning step
    cardProgress.learning_step = 0;
    cardProgress.repetitions = 0;
    cardProgress.interval = learningSteps[0]; // First step (1 minute)
    cardProgress.ease_factor = Math.max(1.3, cardProgress.ease_factor - 0.15);
    
  } else if (isLearning && cardProgress.learning_step >= 0) {
    // Learning phase: navigate learning steps queue
    
    if (grade === "hard") {
      // Hard: keep current queue as it is (do not multiply or remove steps)
      // For new cards: advance one step (from step 0 to step 1 = 6m)
      // For learning cards: stay at current step
      if (!cardProgress.last_review) {
        // New card - advance one step in queue (step 0 → step 1 = 6m)
        cardProgress.learning_step = 1;
        cardProgress.interval = learningSteps[1]; // 6 minutes
        cardProgress.last_review = now; // Mark as reviewed
        cardProgress.repetitions = 1; // First review
      } else {
        // Already reviewed - stay at current learning step
        cardProgress.interval = learningSteps[cardProgress.learning_step];
      }
      // learning_step changes for new cards (0→1), stays same for learning cards
      
    } else if (grade === "good") {
      // Good: optimize forward (skip ahead in queue)
      // For new cards (step 0): skip to step 2 (10m) - skipping 6m step
      // For learning cards: advance appropriately
      if (!cardProgress.last_review) {
        // New card - skip to step 2 (10m) - optimize forward
        cardProgress.learning_step = 2;
        cardProgress.interval = learningSteps[2]; // 10 minutes
        cardProgress.last_review = now;
        cardProgress.repetitions = 1;
      } else if (cardProgress.learning_step < learningSteps.length - 2) {
        // Skip to second-to-last step (e.g., step 1→2)
        cardProgress.learning_step = learningSteps.length - 2;
        cardProgress.interval = learningSteps[learningSteps.length - 2];
      } else if (cardProgress.learning_step === learningSteps.length - 2) {
        // At second-to-last step, go to last step
        cardProgress.learning_step = learningSteps.length - 1;
        cardProgress.interval = learningSteps[learningSteps.length - 1];
      } else {
        // Already at last step, graduate to review
        cardProgress.learning_step = -1; // Mark as graduated
        cardProgress.interval = learningSteps[learningSteps.length - 1];
        cardProgress.repetitions = 1; // First successful review
      }
      
    } else if (grade === "easy") {
      // Easy: increase more (skip to last step and apply bonus)
      if (!cardProgress.last_review) {
        // New card - skip to last step (12d) with bonus and graduate
        cardProgress.interval = learningSteps[learningSteps.length - 1] * settings.easy_bonus;
        cardProgress.learning_step = -1; // Graduate immediately
        cardProgress.last_review = now;
        cardProgress.repetitions = 1;
      } else if (cardProgress.learning_step < learningSteps.length - 1) {
        // Skip to last step and graduate immediately with bonus
        cardProgress.interval = learningSteps[learningSteps.length - 1] * settings.easy_bonus;
        cardProgress.learning_step = -1; // Graduate immediately
        cardProgress.repetitions = 1;
      } else {
        // Already at last step, graduate with easy bonus
        cardProgress.interval = learningSteps[learningSteps.length - 1] * settings.easy_bonus;
        cardProgress.learning_step = -1; // Graduate
        cardProgress.repetitions = 1;
      }
    }
    
    // Update last_review when first reviewed
    if (!cardProgress.last_review) {
      cardProgress.last_review = now;
    }
    
  } else {
    // Review phase (graduated card): apply SM-2 formula
    
    // Adjust ease factor based on grade
    if (grade === "hard") {
      cardProgress.ease_factor = Math.max(1.3, cardProgress.ease_factor - 0.15);
    } else if (grade === "easy") {
      cardProgress.ease_factor = Math.min(3.0, cardProgress.ease_factor + 0.15);
    }
    // "good" doesn't change ease factor
    
    // Calculate new interval based on SM-2
    if (grade === "hard") {
      // Hard: interval × 1 (unchanged) - but can be modified by hard_interval_factor
      // Default hard_interval_factor is 1.2, but user can set it to 1.0 for true "unchanged"
      cardProgress.interval = cardProgress.interval * settings.hard_interval_factor;
    } else if (grade === "good") {
      // Good: interval × ease_factor
      cardProgress.interval = cardProgress.interval * cardProgress.ease_factor;
    } else if (grade === "easy") {
      // Easy: interval × ease_factor × easy_bonus
      cardProgress.interval = cardProgress.interval * cardProgress.ease_factor * settings.easy_bonus;
    }
    
    // Apply interval modifier
    cardProgress.interval = cardProgress.interval * settings.interval_modifier;
    
    // Round and cap at maximum interval
    cardProgress.interval = Math.min(
      Math.round(cardProgress.interval),
      settings.max_interval
    );
    
    cardProgress.repetitions += 1;
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
 * @param {Object} userSettings - User settings (optional)
 * @returns {Object} Object with nextDueDate and interval
 */
export function calculateNextReviewTime(cardProgress, grade, userSettings = null) {
  const now = new Date();
  const settings = userSettings || getDefaultSettings();
  const learningSteps = getLearningSteps(settings);
  
  // Initialize progress if it doesn't exist (new card)
  let tempProgress = cardProgress ? { ...cardProgress } : {
    interval: 0,
    ease_factor: settings.starting_ease_factor,
    repetitions: 0,
    due_date: now,
    last_review: null,
    learning_step: 0
  };
  
  // Infer learning_step if not set (legacy cards)
  if (tempProgress.learning_step === undefined) {
    if (tempProgress.interval < 1) {
      // Find closest learning step
      let closestStep = 0;
      for (let i = 0; i < learningSteps.length; i++) {
        if (Math.abs(tempProgress.interval - learningSteps[i]) < Math.abs(tempProgress.interval - learningSteps[closestStep])) {
          closestStep = i;
        }
      }
      tempProgress.learning_step = closestStep;
    } else {
      tempProgress.learning_step = -1; // Graduated
    }
  }
  
  // Determine if card is in learning phase
  const isLearning = tempProgress.learning_step >= 0;
  
  // Apply the same logic as reviewCard but don't modify the original
  if (grade === "again") {
    tempProgress.learning_step = 0;
    tempProgress.repetitions = 0;
    tempProgress.interval = learningSteps[0];
    tempProgress.ease_factor = Math.max(1.3, tempProgress.ease_factor - 0.15);
    
  } else if (isLearning && tempProgress.learning_step >= 0) {
    // Learning phase
    
    if (grade === "hard") {
      // Hard: keep current step
      tempProgress.interval = learningSteps[tempProgress.learning_step];
      
    } else if (grade === "good") {
      // Good: advance to next step
      if (tempProgress.learning_step < learningSteps.length - 1) {
        tempProgress.learning_step += 1;
        tempProgress.interval = learningSteps[tempProgress.learning_step];
      } else {
        // Graduate
        tempProgress.interval = learningSteps[learningSteps.length - 1];
      }
      
    } else if (grade === "easy") {
      // Easy: advance with bonus
      if (tempProgress.learning_step < learningSteps.length - 1) {
        tempProgress.learning_step = Math.min(tempProgress.learning_step + 1, learningSteps.length - 1);
        tempProgress.interval = learningSteps[tempProgress.learning_step];
        
        if (tempProgress.learning_step === learningSteps.length - 1) {
          tempProgress.interval = learningSteps[learningSteps.length - 1] * settings.easy_bonus;
        }
      } else {
        tempProgress.interval = learningSteps[learningSteps.length - 1] * settings.easy_bonus;
      }
    }
    
  } else {
    // Review phase: SM-2 formula
    
    const originalEaseFactor = tempProgress.ease_factor;
    
    if (grade === "hard") {
      tempProgress.ease_factor = Math.max(1.3, tempProgress.ease_factor - 0.15);
      tempProgress.interval = tempProgress.interval * settings.hard_interval_factor;
    } else if (grade === "good") {
      tempProgress.interval = tempProgress.interval * tempProgress.ease_factor;
    } else if (grade === "easy") {
      tempProgress.ease_factor = Math.min(3.0, tempProgress.ease_factor + 0.15);
      tempProgress.interval = tempProgress.interval * tempProgress.ease_factor * settings.easy_bonus;
    }
    
    // Apply interval modifier
    tempProgress.interval = tempProgress.interval * settings.interval_modifier;
    
    // Cap at maximum
    tempProgress.interval = Math.min(
      Math.round(tempProgress.interval),
      settings.max_interval
    );
  }
  
  // Calculate next due date
  const nextDueDate = new Date(now.getTime() + tempProgress.interval * 24 * 60 * 60 * 1000);
  
  return {
    nextDueDate,
    interval: tempProgress.interval
  };
}
