# Anki-Style SRS Implementation Guide

## Overview

This document explains the implementation of the Anki-style spaced repetition system (SRS) in the Kardo flashcard app.

## Card States

### 1. New Cards (Blue)
- **Definition**: Cards with no `user_progress` entry OR cards with progress but never reviewed (`repetitions = 0` AND `last_review IS NULL`)
- **Display**: Blue number in dashboard and practice mode
- **Behavior**: First time seeing the card

### 2. Learning / Green Cards
- **Definition**: Cards that have been reviewed at least once (`last_review IS NOT NULL`) but are still in learning phase (`interval < 1 day`) and not due yet (`due_date > now()`)
- **Display**: Green number
- **Behavior**: Cards going through short learning steps (minutes/hours)

### 3. Review / Red Cards (Due)
- **Definition**: Cards where `due_date <= now()` (scheduled for review)
- **Display**: Red number
- **Behavior**: Cards that need to be reviewed based on spaced repetition

### 4. Mature Cards
- **Definition**: Cards with `interval >= 1 day` and `due_date > now()`
- **Display**: Not shown in practice mode (not due yet)
- **Behavior**: Cards that have graduated from learning and are in long-term review

## Card Fetching Priority

Cards are fetched in this order for practice sessions:

1. **Due Cards (Red)** - Priority 0
   - `due_date <= CURRENT_TIMESTAMP`
   - Ordered by `due_date ASC` (oldest first)

2. **Learning Cards (Green)** - Priority 1
   - `interval < 1` AND `due_date > CURRENT_TIMESTAMP` AND `last_review IS NOT NULL`
   - Ordered by `due_date ASC`

3. **New Cards (Blue)** - Priority 2
   - No `user_progress` entry OR `repetitions = 0 AND last_review IS NULL`
   - Ordered by `card_id ASC`
   - Note: Can add daily limit here in future

## Next Review Time Calculation

### For Learning Cards / New Cards

When a card is in learning phase (`repetitions < 2` OR `interval < 1 day`):

- **Again** → `<1m` (1 minute)
- **Hard** → `<6m` (6 minutes)
- **Good** → `<10m` (10 minutes)
- **Easy** → `<3d` (3 days - graduates from learning)

### For Review Cards

When a card has graduated (`repetitions >= 2` AND `interval >= 1 day`):

- **Again** → `1d` (resets to 1 day, goes back to learning)
- **Hard** → `interval × 1.2` (slower growth, ease_factor decreases by 0.15)
- **Good** → `interval × ease_factor` (normal growth, no change to ease_factor)
- **Easy** → `interval × ease_factor × 1.3` (faster growth, ease_factor increases by 0.15)

**Example:**
- Current interval: 10 days, ease_factor: 2.5
- **Hard**: 10 × 1.2 = 12 days (ease_factor becomes 2.35)
- **Good**: 10 × 2.5 = 25 days (ease_factor stays 2.5)
- **Easy**: 10 × 2.5 × 1.3 = 32.5 days (ease_factor becomes 2.65)

## Database Schema

### `user_progress` Table

```sql
CREATE TABLE user_progress (
    user_id UUID NOT NULL,
    card_id INTEGER NOT NULL,
    interval NUMERIC(10, 6) DEFAULT 0,  -- Supports fractional days (minutes/hours)
    ease_factor FLOAT DEFAULT 2.5,      -- Minimum 1.3
    repetitions INTEGER DEFAULT 0,       -- Number of successful reviews
    due_date TIMESTAMP,                 -- When card should be reviewed next
    last_review TIMESTAMP,              -- Last review timestamp (NULL = never reviewed)
    PRIMARY KEY (user_id, card_id)
);
```

**Key Points:**
- `interval` is `NUMERIC(10, 6)` to support fractional days (e.g., 1 minute = 0.000694 days)
- `last_review IS NULL` means card has never been reviewed (still "new")
- `interval < 1` AND `last_review IS NOT NULL` means card is in learning phase

## API Endpoints

### `GET /api/decks/:deckId/due-cards`
Fetches cards for practice in priority order:
- Due cards first
- Learning cards second
- New cards last
- Returns up to 50 cards per request

### `POST /api/cards/:cardId/review`
Updates card progress using SRS algorithm:
- Accepts: `{ userId, grade: "again" | "hard" | "good" | "easy" }`
- Calculates new interval, ease_factor, repetitions
- Updates `due_date` and `last_review`
- Returns updated progress

### `POST /api/decks/:deckId/init-progress`
Initializes progress for all cards in a deck:
- Creates `user_progress` entries with `last_review = NULL`
- Cards remain "new" until first review

### `GET /api/decks/:deckId/statistics`
Returns counts for deck overview:
- `new`: Cards never reviewed
- `learning`: Cards in learning phase (interval < 1 day, not due)
- `due`: Cards due for review
- `total`: Total cards in deck

## Frontend Components

### Dashboard (`client/src/pages/Dashboard.jsx`)
- Shows large numbers: Blue (New), Red (Due), Green (Learning)
- Updates automatically when cards are reviewed

### Practice Mode (`client/src/pages/DeckPage.jsx`)
- Shows statistics at top (New, Due, Learning counts)
- Displays one card at a time
- Buttons show next review time (e.g., `<1m`, `6m`, `10m`, `3d`, `12d`)
- Updates progress and loads next card after review

### SRS Utilities (`client/src/utils/srs.js`)
- `calculateNextReviewTime()`: Preview next review time for each button
- `formatNextReviewTime()`: Format time as `<1m`, `6m`, `10m`, `1d`, `2w`, etc.

## Algorithm Details

### Learning Phase Detection
```javascript
const isLearning = cardProgress.repetitions < 2 || cardProgress.interval < 1;
```

### Review Card Interval Calculation
```javascript
// Hard: interval × 1.2 (slower growth)
interval = Math.round(interval * 1.2);
ease_factor = Math.max(1.3, ease_factor - 0.15);

// Good: interval × ease_factor (normal growth)
interval = Math.round(interval * ease_factor);
// ease_factor unchanged

// Easy: interval × ease_factor × 1.3 (faster growth)
interval = Math.round(interval * ease_factor * 1.3);
ease_factor = ease_factor + 0.15;
```

### Ease Factor Constraints
- Minimum: 1.3
- Default: 2.5
- Adjusts based on user performance

## Important Notes

1. **Interval Type**: Must be `NUMERIC(10, 6)` not `INTEGER` to support learning steps
2. **New vs Learning**: Cards are "new" until `last_review IS NOT NULL`
3. **Priority Order**: Always fetch due → learning → new for proper Anki-like flow
4. **Daily Limits**: Can be added to limit new cards per day (not implemented yet)

## Testing

After running the database migration (`fix_interval_type.sql`):
1. Cards should show correct learning steps (<1m, <6m, <10m, <3d)
2. Review cards should show dynamic intervals based on ease_factor
3. Statistics should accurately reflect new/learning/due counts
4. Practice mode should prioritize cards correctly

