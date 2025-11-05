# Learning Steps Queue Implementation

## Overview

This document explains the complete Anki-style learning steps queue implementation with user-configurable settings.

---

## 1. Learning Steps Queue System

### Default Queue: `[1m, 6m, 10m, 12d]`

Cards progress through a fixed queue of intervals:
- **Step 0**: 1 minute
- **Step 1**: 6 minutes  
- **Step 2**: 10 minutes
- **Step 3**: 12 days (graduation)

### How It Works

**Database Tracking:**
- `learning_step` column in `user_progress` tracks current position:
  - `0, 1, 2, 3` = In learning phase (on that step)
  - `-1` = Graduated (became a review card)
  - `NULL` = Legacy card (inferred from interval)

**Card State Determination:**
```javascript
// Card is learning if:
learning_step >= 0  // Not graduated

// Card is review if:
learning_step === -1  // Graduated
OR interval >= 1 day  // Legacy support
```

---

## 2. Button Behavior for Learning Cards

### Again → Reset Queue
```javascript
learning_step = 0
interval = learningSteps[0]  // 1 minute
repetitions = 0
ease_factor -= 0.15
```
**Result**: Card goes back to first step (1 minute)

### Hard → Keep Current Step
```javascript
// No change to learning_step
interval = learningSteps[current_step]  // Stay at same step
```
**Result**: Card stays at current step (e.g., if at 10m, stays at 10m)

### Good → Advance One Step
```javascript
if (learning_step < learningSteps.length - 1) {
  learning_step += 1
  interval = learningSteps[learning_step]  // Next step
} else {
  // At last step → graduate
  learning_step = -1
  interval = learningSteps[last]  // 12 days
  repetitions = 1
}
```
**Result**: 
- Step 0 (1m) → Step 1 (6m)
- Step 1 (6m) → Step 2 (10m)
- Step 2 (10m) → Step 3 (12d)
- Step 3 (12d) → **Graduate** (becomes review card)

### Easy → Advance with Bonus
```javascript
if (learning_step < learningSteps.length - 1) {
  learning_step += 1
  interval = learningSteps[learning_step]
  
  if (learning_step === learningSteps.length - 1) {
    // At last step, apply easy bonus
    interval = learningSteps[last] * easy_bonus  // 12d × 1.3 = 15.6d
    learning_step = -1  // Graduate
    repetitions = 1
  }
} else {
  // Already at last step
  interval = learningSteps[last] * easy_bonus
  learning_step = -1  // Graduate
  repetitions = 1
}
```
**Result**: Advances faster and applies bonus at graduation

---

## 3. Review Card Behavior (SM-2 Formula)

Once a card graduates (`learning_step = -1`), SM-2 applies:

### Again → Reset to Learning
```javascript
learning_step = 0  // Back to learning
interval = learningSteps[0]  // 1 minute
repetitions = 0
ease_factor -= 0.15
```
**Result**: Card goes back to learning phase

### Hard → Interval × hard_interval_factor
```javascript
interval = interval * hard_interval_factor  // Default 1.0 (unchanged)
ease_factor -= 0.15
```
**Result**: 
- If `hard_interval_factor = 1.0` → interval unchanged
- If `hard_interval_factor = 1.2` → interval × 1.2

### Good → Interval × ease_factor
```javascript
interval = interval * ease_factor  // Default 2.5
// ease_factor unchanged
```
**Result**: Normal growth based on ease factor

### Easy → Interval × ease_factor × easy_bonus
```javascript
interval = interval * ease_factor * easy_bonus  // Default 2.5 × 1.3
ease_factor += 0.15
```
**Result**: Faster growth with bonus

### Final Calculations
```javascript
// Apply interval modifier
interval = interval * interval_modifier  // Default 1.0

// Cap at maximum interval
interval = Math.min(interval, max_interval)  // Default 36500 days
```

---

## 4. User Settings

### Available Settings

| Setting | Default | Min | Max | Description |
|---------|---------|-----|-----|-------------|
| `max_interval` | 36500 | 1 | 100000 | Maximum interval in days |
| `starting_ease_factor` | 2.5 | 1.1 | 3.0 | Initial ease factor for new cards |
| `easy_bonus` | 1.3 | 1.0 | 2.0 | Multiplier for "Easy" button |
| `interval_modifier` | 1.0 | 0.5 | 2.0 | Global interval multiplier |
| `hard_interval_factor` | 1.0 | 1.0 | 2.0 | Multiplier for "Hard" button (review cards) |
| `new_cards_per_day` | 20 | 1 | 200 | Daily limit for new cards |
| `learning_steps` | "1m,6m,10m,12d" | - | - | Learning steps queue |

### Learning Steps Format

Format: `"1m,6m,10m,12d"` (comma-separated)
- `m` = minutes
- `h` = hours  
- `d` = days

Examples:
- `"1m,6m,10m,12d"` (default)
- `"1m,5m,10m,1d,3d"` (5 steps)
- `"2m,15m,1h,1d"` (custom intervals)

---

## 5. Database Schema

### `user_progress` Table
```sql
learning_step INTEGER DEFAULT 0
-- 0, 1, 2, 3 = Learning phase (position in queue)
-- -1 = Graduated (review card)
-- NULL = Legacy (inferred from interval)
```

### `user_settings` Table
```sql
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY,
    max_interval INTEGER DEFAULT 36500,
    starting_ease_factor FLOAT DEFAULT 2.5,
    easy_bonus FLOAT DEFAULT 1.3,
    interval_modifier FLOAT DEFAULT 1.0,
    hard_interval_factor FLOAT DEFAULT 1.0,
    new_cards_per_day INTEGER DEFAULT 20,
    learning_steps TEXT DEFAULT '1m,6m,10m,12d'
);
```

---

## 6. API Endpoints

### Get User Settings
```
GET /api/users/:userId/settings
```
Returns user settings or defaults if not set.

### Update User Settings
```
PUT /api/users/:userId/settings
Body: { max_interval, starting_ease_factor, easy_bonus, ... }
```
Validates and saves settings with safe limits.

### Review Card
```
POST /api/cards/:cardId/review
Body: { userId, grade }
```
Applies SRS algorithm with user settings.

---

## 7. Example Flow

### New Card Review Flow

```
1. New card (learning_step = 0, interval = 0)
   → Press "Good"
   → learning_step = 1, interval = 6m

2. Learning card at step 1 (6m)
   → Press "Good"  
   → learning_step = 2, interval = 10m

3. Learning card at step 2 (10m)
   → Press "Good"
   → learning_step = 3, interval = 12d

4. Learning card at step 3 (12d)
   → Press "Good"
   → learning_step = -1 (graduate!), interval = 12d
   → Card becomes review card

5. Review card (interval = 12d, ease_factor = 2.5)
   → Press "Good"
   → interval = 12d × 2.5 = 30d
   → Card is mature (not due yet)
```

### Hard Button Examples

```
1. Learning card at step 1 (6m)
   → Press "Hard"
   → learning_step = 1 (unchanged), interval = 6m
   → Card stays at 6m step

2. Review card (interval = 30d)
   → Press "Hard" (hard_interval_factor = 1.0)
   → interval = 30d × 1.0 = 30d (unchanged)
   → ease_factor decreases
```

### Easy Button Examples

```
1. Learning card at step 2 (10m)
   → Press "Easy"
   → learning_step = 3 (12d)
   → interval = 12d × 1.3 = 15.6d (bonus applied)
   → learning_step = -1 (graduate immediately!)

2. Review card (interval = 30d, ease_factor = 2.5)
   → Press "Easy"
   → interval = 30d × 2.5 × 1.3 = 97.5d
   → ease_factor increases
```

---

## 8. Migration Steps

1. **Run `fix_interval_type.sql`** (if not already done)
   ```sql
   ALTER TABLE user_progress 
   ALTER COLUMN interval TYPE NUMERIC(10, 6);
   ```

2. **Run `migration_learning_steps.sql`**
   ```sql
   -- Adds learning_step column
   -- Creates user_settings table
   ```

3. **Restart server** to load new code

---

## 9. Key Implementation Details

### Learning Step Navigation

The system tracks which step a card is on:
- **New cards**: `learning_step = 0` (but `last_review = NULL` so still "new")
- **Learning cards**: `learning_step = 0, 1, 2, or 3` (in queue)
- **Review cards**: `learning_step = -1` (graduated)

### Button Logic

**Learning Cards:**
- Again → Reset to step 0
- Hard → Stay at current step
- Good → Advance one step (or graduate if at last)
- Easy → Advance one step + apply bonus if at last

**Review Cards:**
- Again → Reset to learning (step 0)
- Hard → Interval × hard_interval_factor (default 1.0 = unchanged)
- Good → Interval × ease_factor
- Easy → Interval × ease_factor × easy_bonus

### User Settings Integration

Settings are fetched when:
- Reviewing a card (server-side)
- Calculating next review times (client-side)

If settings don't exist, defaults are used.

---

## 10. Code Structure

### Server-Side
- `server/srs-algorithm.js` - Core SRS logic with learning steps
- `server/user-settings.js` - Settings parsing and validation
- `server/server.js` - API endpoints with settings integration

### Client-Side
- `client/src/utils/srs.js` - Preview calculations with learning steps
- `client/src/pages/DeckPage.jsx` - Practice mode with settings
- `client/src/api/decks.js` - Settings API calls

---

## Summary

This implementation provides:
✅ Learning steps queue system (default: [1m, 6m, 10m, 12d])
✅ Button behavior matching Anki (Hard keeps step, Good advances, Easy with bonus)
✅ SM-2 formula for review cards with user-configurable settings
✅ User settings API with safe limits
✅ Dynamic next review time calculations
✅ Full backward compatibility with legacy cards

The system is now ready for production use!

