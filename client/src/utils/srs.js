/**
 * Client-side SRS utility functions
 * Mirrors the server-side algorithm for previewing next review times
 * Uses learning steps queues for new/learning cards
 */

/**
 * Default learning steps queue: [1m, 6m, 10m, 12d]
 */
const DEFAULT_LEARNING_STEPS = [
  1 / (24 * 60),      // 1 minute
  6 / (24 * 60),      // 6 minutes
  10 / (24 * 60),     // 10 minutes
  12                  // 12 days
];

/**
 * Parse learning steps string (e.g., "1m,6m,10m,12d") to array of days
 */
function parseLearningSteps(stepsString) {
  if (!stepsString) {
    return DEFAULT_LEARNING_STEPS;
  }
  
  const steps = stepsString.split(',').map(step => step.trim());
  const parsedSteps = [];
  
  for (const step of steps) {
    const match = step.match(/^(\d+)([mhd])$/i);
    if (!match) {
      return DEFAULT_LEARNING_STEPS;
    }
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    let days;
    if (unit === 'm') {
      days = value / (24 * 60);
    } else if (unit === 'h') {
      days = value / 24;
    } else if (unit === 'd') {
      days = value;
    } else {
      return DEFAULT_LEARNING_STEPS;
    }
    
    parsedSteps.push(days);
  }
  
  return parsedSteps.length > 0 ? parsedSteps : DEFAULT_LEARNING_STEPS;
}

/**
 * Get default user settings
 */
function getDefaultSettings() {
  return {
    max_interval: 36500,
    starting_ease_factor: 2.5,
    easy_bonus: 1.3,
    interval_modifier: 1.0,
    hard_interval_factor: 1.2,
    new_cards_per_day: 20,
    learning_steps: '1m,6m,10m,12d'
  };
}

/**
 * Calculate the next review time for a card based on a grade, without modifying progress
 * @param {Object} cardProgress - Current progress object (can be null for new cards)
 * @param {string} grade - "again", "hard", "good", or "easy"
 * @param {Object} userSettings - User settings (optional, uses defaults if not provided)
 * @returns {Object} Object with nextDueDate and interval
 */
export function calculateNextReviewTime(cardProgress, grade, userSettings = null) {
  const now = new Date();
  const settings = userSettings || getDefaultSettings();
  const learningSteps = parseLearningSteps(settings.learning_steps || '1m,6m,10m,12d');
  
  // Initialize progress if it doesn't exist (new card)
  let tempProgress = cardProgress ? { ...cardProgress } : {
    interval: 0,
    ease_factor: settings.starting_ease_factor || 2.5,
    repetitions: 0,
    due_date: now,
    last_review: null,
    learning_step: 0  // Start at first learning step
  };
  
  // Infer learning_step if not set (legacy cards)
  // But prioritize explicit learning_step = 0 for new cards
  if (tempProgress.learning_step === undefined || tempProgress.learning_step === null) {
    // If card has never been reviewed (last_review is null), it's at step 0
    if (tempProgress.last_review === null || tempProgress.last_review === undefined) {
      tempProgress.learning_step = 0;
    } else if (tempProgress.interval < 1) {
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
  
  // Ensure learning_step is a number
  tempProgress.learning_step = parseInt(tempProgress.learning_step) || 0;
  
  // For new cards (never reviewed), ensure last_review is explicitly null and learning_step is 0
  if (!tempProgress.last_review) {
    tempProgress.last_review = null;
    tempProgress.learning_step = 0;
  }
  
  // Determine if card is in learning phase
  const isLearning = tempProgress.learning_step >= 0;
  
  // Apply the same logic as server-side reviewCard
  if (grade === "again") {
    // Reset to first learning step
    tempProgress.learning_step = 0;
    tempProgress.repetitions = 0;
    tempProgress.interval = learningSteps[0]; // First step (1 minute)
    tempProgress.ease_factor = Math.max(1.3, tempProgress.ease_factor - 0.15);
    
  } else if (isLearning && tempProgress.learning_step >= 0) {
    // Learning phase: navigate learning steps queue
    
    if (grade === "hard") {
      // Hard: keep current queue as it is (do not multiply or remove steps)
      // For new cards (never reviewed): advance one step (from step 0 to step 1 = 6m)
      // For learning cards (already reviewed): stay at current step
      if (!tempProgress.last_review) {
        // New card - advance one step in queue (step 0 → step 1 = 6m)
        tempProgress.learning_step = 1;
        tempProgress.interval = learningSteps[1]; // 6 minutes
      } else {
        // Already reviewed - stay at current learning step
        tempProgress.interval = learningSteps[tempProgress.learning_step];
      }
      // learning_step changes for new cards (0→1), stays same for learning cards
      
    } else if (grade === "good") {
      // Good: optimize forward (skip ahead in queue)
      // For new cards (step 0): skip to step 2 (10m) - skipping 6m step
      // For learning cards: advance appropriately
      if (!tempProgress.last_review) {
        // New card - skip to step 2 (10m) - optimize forward
        tempProgress.learning_step = 2;
        tempProgress.interval = learningSteps[2]; // 10 minutes
      } else if (tempProgress.learning_step < learningSteps.length - 2) {
        // Skip to second-to-last step (e.g., step 1→2 for [1m, 6m, 10m, 12d])
        tempProgress.learning_step = learningSteps.length - 2;
        tempProgress.interval = learningSteps[learningSteps.length - 2];
      } else if (tempProgress.learning_step === learningSteps.length - 2) {
        // At second-to-last step, go to last step
        tempProgress.learning_step = learningSteps.length - 1;
        tempProgress.interval = learningSteps[learningSteps.length - 1];
      } else {
        // Already at last step, will graduate
        tempProgress.interval = learningSteps[learningSteps.length - 1];
      }
      
    } else if (grade === "easy") {
      // Easy: increase more (skip to last step and apply bonus)
      if (!tempProgress.last_review) {
        // New card - skip to last step (12d) with bonus
        tempProgress.interval = learningSteps[learningSteps.length - 1] * (settings.easy_bonus || 1.3);
      } else if (tempProgress.learning_step < learningSteps.length - 1) {
        // Skip to last step and apply bonus (will graduate)
        tempProgress.interval = learningSteps[learningSteps.length - 1] * (settings.easy_bonus || 1.3);
      } else {
        // Already at last step, graduate with easy bonus
        tempProgress.interval = learningSteps[learningSteps.length - 1] * (settings.easy_bonus || 1.3);
      }
    }
    
  } else {
    // Review phase (graduated card): apply SM-2 formula
    
    const originalEaseFactor = tempProgress.ease_factor;
    
    if (grade === "hard") {
      // Hard: interval × hard_interval_factor (default 1.2, but can be 1.0)
      tempProgress.ease_factor = Math.max(1.3, tempProgress.ease_factor - 0.15);
      tempProgress.interval = tempProgress.interval * (settings.hard_interval_factor || 1.2);
    } else if (grade === "good") {
      // Good: interval × ease_factor
      tempProgress.interval = tempProgress.interval * tempProgress.ease_factor;
    } else if (grade === "easy") {
      // Easy: interval × ease_factor × easy_bonus
      tempProgress.ease_factor = Math.min(3.0, tempProgress.ease_factor + 0.15);
      tempProgress.interval = tempProgress.interval * tempProgress.ease_factor * (settings.easy_bonus || 1.3);
    }
    
    // Apply interval modifier
    tempProgress.interval = tempProgress.interval * (settings.interval_modifier || 1.0);
    
    // Cap at maximum interval
    tempProgress.interval = Math.min(
      Math.round(tempProgress.interval),
      settings.max_interval || 36500
    );
  }
  
  // Calculate next due date
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
