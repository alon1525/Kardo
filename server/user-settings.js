/**
 * User Settings Utilities
 * Handles parsing and validation of SRS settings
 */

/**
 * Default learning steps queue
 */
const DEFAULT_LEARNING_STEPS = [
  1 / (24 * 60),      // 1 minute
  6 / (24 * 60),      // 6 minutes
  10 / (24 * 60),     // 10 minutes
  12                  // 12 days
];

/**
 * Parse learning steps string (e.g., "1m,6m,10m,12d") to array of days
 * @param {string} stepsString - Comma-separated steps like "1m,6m,10m,12d"
 * @returns {number[]} Array of intervals in days
 */
export function parseLearningSteps(stepsString) {
  if (!stepsString) {
    return DEFAULT_LEARNING_STEPS;
  }
  
  const steps = stepsString.split(',').map(step => step.trim());
  const parsedSteps = [];
  
  for (const step of steps) {
    const match = step.match(/^(\d+)([mhd])$/i);
    if (!match) {
      console.warn(`Invalid learning step format: ${step}, using default`);
      return DEFAULT_LEARNING_STEPS;
    }
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    let days;
    if (unit === 'm') {
      days = value / (24 * 60); // minutes to days
    } else if (unit === 'h') {
      days = value / 24; // hours to days
    } else if (unit === 'd') {
      days = value; // days
    } else {
      console.warn(`Unknown unit: ${unit}, using default`);
      return DEFAULT_LEARNING_STEPS;
    }
    
    parsedSteps.push(days);
  }
  
  return parsedSteps.length > 0 ? parsedSteps : DEFAULT_LEARNING_STEPS;
}

/**
 * Format learning steps array to string (e.g., [0.000694, 0.004167, 0.006944, 12] → "1m,6m,10m,12d")
 * @param {number[]} steps - Array of intervals in days
 * @returns {string} Formatted string
 */
export function formatLearningSteps(steps) {
  return steps.map(step => {
    if (step < 1 / 24) {
      // Less than 1 hour, show as minutes
      const minutes = Math.round(step * 24 * 60);
      return `${minutes}m`;
    } else if (step < 1) {
      // Less than 1 day, show as hours
      const hours = Math.round(step * 24);
      return `${hours}h`;
    } else {
      // Days
      return `${Math.round(step)}d`;
    }
  }).join(',');
}

/**
 * Get default user settings
 */
export function getDefaultSettings() {
  return {
    max_interval: 36500,
    starting_ease_factor: 2.5,
    easy_bonus: 1.3,
    interval_modifier: 1.0,
    hard_interval_factor: 1.0, // Default to 1.0 (unchanged) per requirements
    new_cards_per_day: 20,
    learning_steps: '1m,6m,10m,12d'
  };
}

/**
 * Validate and sanitize user settings
 */
export function validateSettings(settings) {
  const defaults = getDefaultSettings();
  const validated = { ...defaults };
  
  // Max interval
  if (settings.max_interval !== undefined) {
    validated.max_interval = Math.max(1, Math.min(100000, parseInt(settings.max_interval) || defaults.max_interval));
  }
  
  // Starting ease factor
  if (settings.starting_ease_factor !== undefined) {
    validated.starting_ease_factor = Math.max(1.1, Math.min(3.0, parseFloat(settings.starting_ease_factor) || defaults.starting_ease_factor));
  }
  
  // Easy bonus
  if (settings.easy_bonus !== undefined) {
    validated.easy_bonus = Math.max(1.0, Math.min(2.0, parseFloat(settings.easy_bonus) || defaults.easy_bonus));
  }
  
  // Interval modifier
  if (settings.interval_modifier !== undefined) {
    validated.interval_modifier = Math.max(0.5, Math.min(2.0, parseFloat(settings.interval_modifier) || defaults.interval_modifier));
  }
  
  // Hard interval factor
  if (settings.hard_interval_factor !== undefined) {
    validated.hard_interval_factor = Math.max(1.0, Math.min(2.0, parseFloat(settings.hard_interval_factor) || defaults.hard_interval_factor));
  }
  
  // New cards per day
  if (settings.new_cards_per_day !== undefined) {
    validated.new_cards_per_day = Math.max(1, Math.min(200, parseInt(settings.new_cards_per_day) || defaults.new_cards_per_day));
  }
  
  // Learning steps
  if (settings.learning_steps !== undefined) {
    validated.learning_steps = settings.learning_steps || defaults.learning_steps;
    // Validate by parsing
    const parsed = parseLearningSteps(validated.learning_steps);
    if (parsed.length === 0) {
      validated.learning_steps = defaults.learning_steps;
    }
  }
  
  return validated;
}

