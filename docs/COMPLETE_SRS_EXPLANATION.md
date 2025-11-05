# Complete SRS System Explanation

## Overview

This document explains how the Anki-style spaced repetition system works in Kardo, including card types, prioritization, and the review flow.

---

## 1. Card Types / States

Cards are categorized into 4 main states based on their progress:

### 🔵 **New Cards**
**Definition**: Cards the user has never studied

**How we determine it:**
```sql
-- No user_progress entry exists
up.user_id IS NULL

-- OR has progress but never reviewed
up.repetitions = 0 AND up.last_review IS NULL
```

**Characteristics:**
- No entry in `user_progress` table, OR
- Has a `user_progress` entry (from `init-progress`) but `last_review IS NULL`
- `repetitions = 0`
- Ready to be introduced to the user

**Example:**
- Card created → automatically available as "New"
- User clicks "Practice" → `init-progress` creates entry with `last_review = NULL` → still "New"
- First review → `last_review` gets set → becomes "Learning"

---

### 🟢 **Learning Cards (Green)**
**Definition**: Cards that have been reviewed but are still in the learning phase (short intervals)

**How we determine it:**
```sql
-- Has been reviewed at least once
up.last_review IS NOT NULL

-- AND still in learning phase (short intervals)
up.interval < 1  -- Less than 1 day (minutes/hours)
```

**Characteristics:**
- `last_review IS NOT NULL` (has been reviewed at least once)
- `interval < 1 day` (e.g., 1 minute, 6 minutes, 10 minutes)
- `repetitions` can be 0, 1, or more (but interval is still short)
- Shown frequently until mastered

**Example:**
- First review with "Good" → `interval = 10 minutes`, `last_review = now()` → becomes "Learning"
- Card can be due (green number) or not due yet (still learning)

---

### 🔴 **Due Cards (Red)**
**Definition**: Cards that need to be reviewed NOW (`due_date <= now()`)

**How we determine it:**
```sql
-- No progress (new cards are always due)
up.user_id IS NULL

-- OR due date has passed
up.due_date <= CURRENT_TIMESTAMP
```

**Characteristics:**
- Can include:
  - New cards (never reviewed)
  - Learning cards that are due (e.g., 10 minutes passed)
  - Review cards that are due (e.g., 3 days passed)
- These are the cards shown in practice mode
- **Priority 0** in fetching

**Example:**
- New card → always due (red)
- Learning card with 10-minute interval → becomes due after 10 minutes
- Review card with 3-day interval → becomes due after 3 days

---

### ⚪ **Mature Cards**
**Definition**: Cards with long intervals that are NOT due yet (`interval >= 1 day` AND `due_date > now()`)

**How we determine it:**
```sql
-- Has progress
up.user_id IS NOT NULL

-- AND graduated from learning
up.interval >= 1  -- At least 1 day

-- AND not due yet
up.due_date > CURRENT_TIMESTAMP
```

**Characteristics:**
- `interval >= 1 day` (graduated from learning phase)
- `due_date > now()` (not due yet)
- Not shown in practice mode (will appear when due)
- These are the "missing" cards you asked about!

**Example:**
- Card reviewed with "Easy" → `interval = 3 days` → becomes "Mature" (not shown for 3 days)
- After 3 days → `due_date <= now()` → becomes "Due" (red) → appears in practice

---

## 2. Card Prioritization & Fetching

When you click "Practice", the system fetches cards in this priority order:

### Priority Order (in practice mode)

```
Priority 0: Due Cards (Red) - shown first
Priority 1: Learning Cards (Green) - not due yet, shown second  
Priority 2: New Cards (Blue) - shown last
Priority 3: Mature Cards - NOT shown (not due yet)
```

### SQL Query Logic

```sql
SELECT cards...
ORDER BY 
  priority ASC,        -- Due first, then Learning, then New
  up.due_date ASC,     -- Oldest due dates first
  c.id ASC             -- Card ID as tiebreaker
LIMIT 50
```

**Priority Calculation:**
```sql
CASE 
  -- New cards (priority 2)
  WHEN up.user_id IS NULL THEN 2
  WHEN up.repetitions = 0 AND up.last_review IS NULL THEN 2
  
  -- Due cards (priority 0) - shown FIRST
  WHEN up.due_date <= CURRENT_TIMESTAMP THEN 0
  
  -- Learning cards not due yet (priority 1)
  WHEN up.interval < 1 AND up.last_review IS NOT NULL THEN 1
  
  -- Mature cards (priority 3) - NOT shown
  ELSE 3
END as priority
```

### Why This Order?

1. **Due cards first** - Cards that need immediate review (red)
2. **Learning cards second** - Cards still in learning phase but not due yet (green)
3. **New cards last** - Controlled introduction (blue)
4. **Mature cards excluded** - Not due yet, don't show

---

## 3. Review Flow & State Transitions

### Starting Practice

1. User clicks "Practice" button
2. `handleStartReview()` is called:
   ```javascript
   // Initialize progress for all cards (if needed)
   await initProgress(deckId, userId);
   
   // Fetch due cards in priority order
   const due = await getDueCards(deckId, userId);
   setDueCards(due);
   ```

3. Cards are fetched in priority order:
   - Due cards (red) appear first
   - Then learning cards (green) if any
   - Then new cards (blue)

### Reviewing a Card

1. User sees card front → clicks to reveal back
2. User clicks one of 4 buttons: **Again / Hard / Good / Easy**
3. `handleAnswer(grade)` is called:

```javascript
// Step 1: Update progress in database
await reviewCardAPI(cardId, userId, grade);

// Step 2: Refresh cards from server (to get updated counts)
const refreshedCards = await getDueCards(deckId, userId);
setDueCards(refreshedCards);

// Step 3: Move to next card
setCurrentCardIndex(nextIndex);
```

### State Transitions

#### New Card → Learning Card
```
Review: "Good"
Before: last_review = NULL, interval = 0
After:  last_review = now(), interval = 10 minutes
Result: New → Learning (green)
```

#### Learning Card → Mature Card
```
Review: "Easy"
Before: interval = 10 minutes, repetitions = 1
After:  interval = 3 days, repetitions = 2
Result: Learning → Mature (graduated!)
```

#### Learning Card → Learning Card (Still Learning)
```
Review: "Hard"
Before: interval = 10 minutes
After:  interval = 6 minutes (shorter interval)
Result: Still Learning (green)
```

#### Mature Card → Due Card
```
Time passes: 3 days
Before: due_date = future, interval = 3 days
After:  due_date <= now()
Result: Mature → Due (red, appears in practice)
```

#### Review Card → Learning Card (Reset)
```
Review: "Again"
Before: interval = 10 days, repetitions = 5
After:  interval = 1 minute, repetitions = 0
Result: Review → Learning (reset to learning phase)
```

---

## 4. Next Review Time Calculation

The system calculates what the next review time will be **before** you click a button, so you can see what will happen.

### For Learning Cards / New Cards

```javascript
if (grade === "again") {
  interval = 1 minute  // Reset to first learning step
} else if (grade === "hard") {
  interval = 6 minutes  // Second learning step
} else if (grade === "good") {
  interval = 10 minutes // Third learning step
} else if (grade === "easy") {
  interval = 3 days     // Graduate from learning!
}
```

### For Review Cards (Mature)

```javascript
if (grade === "again") {
  interval = 1 minute  // Reset to learning (minimum interval)
  ease_factor -= 0.15  // Decrease difficulty
} else if (grade === "hard") {
  interval = current_interval × 1.2      // Slower growth
  ease_factor -= 0.15                     // Decrease difficulty
} else if (grade === "good") {
  interval = current_interval × ease_factor  // Normal growth
  // ease_factor unchanged
} else if (grade === "easy") {
  interval = current_interval × ease_factor × 1.3  // Faster growth
  ease_factor += 0.15                               // Increase difficulty
}
```

**Example:**
- Current interval: 10 days, ease_factor: 2.5
- **Hard**: 10 × 1.2 = 12 days (ease_factor → 2.35)
- **Good**: 10 × 2.5 = 25 days (ease_factor → 2.5)
- **Easy**: 10 × 2.5 × 1.3 = 32.5 days (ease_factor → 2.65)

---

## 5. Statistics & Counts

### Dashboard Statistics

When you view the dashboard, each deck shows:

```
New: 4        (Blue)   - Never reviewed
Due: 6        (Red)    - Need review now
Learning: 2   (Green)  - In learning phase
Total: 10              - All cards
Mature: 0              - Graduated, not due yet
```

### How Counts Are Calculated

**New Cards:**
```sql
SELECT COUNT(*) FROM cards
WHERE (no user_progress OR never reviewed)
```

**Learning Cards:**
```sql
SELECT COUNT(*) FROM cards
WHERE interval < 1 day AND last_review IS NOT NULL
```

**Due Cards:**
```sql
SELECT COUNT(*) FROM cards
WHERE (no progress OR due_date <= now())
```

**Mature Cards:**
```sql
SELECT COUNT(*) FROM cards
WHERE interval >= 1 day AND due_date > now()
```

### Verification

The system verifies counts add up:
```
New + Learning + Due + Mature = Total Cards
```

If they don't match, the server logs a warning.

---

## 6. Practice Mode Flow

### Step-by-Step

1. **User clicks "Practice"**
   ```
   → handleStartReview()
   → initProgress() [if needed]
   → getDueCards() [fetches in priority order]
   → setDueCards(cards)
   → setDeckMode('practice')
   ```

2. **Card Display**
   ```
   → Shows first card from dueCards array
   → Displays statistics (New/Due/Learning counts)
   → Shows card front
   ```

3. **User Flips Card**
   ```
   → handleFlip()
   → Shows card back
   → Shows 4 buttons with next review times
   ```

4. **User Clicks Button**
   ```
   → handleAnswer(grade)
   → reviewCardAPI() [updates database]
   → getDueCards() [refreshes list]
   → setDueCards(refreshedCards) [updates state]
   → Statistics recalculate automatically
   → Move to next card
   ```

5. **Next Card**
   ```
   → If more cards in queue → show next
   → If queue empty → refresh from server
   → If still empty → "Review complete!"
   ```

---

## 7. Key Database Fields

### `user_progress` Table

```sql
interval NUMERIC(10, 6)  -- Days until next review
                        -- Supports fractional (1 min = 0.000694 days)
                        
ease_factor FLOAT       -- Difficulty multiplier (1.3 minimum, default 2.5)

repetitions INTEGER     -- Number of successful reviews
                        -- 0 = new/learning, 2+ = review

due_date TIMESTAMP      -- When card should be reviewed next

last_review TIMESTAMP   -- Last review time
                        -- NULL = never reviewed (still "new")
```

### Critical Field: `last_review`

- **`NULL`** = Card has never been reviewed → **New** (blue)
- **`NOT NULL`** = Card has been reviewed → **Learning** or **Review**

This is the key distinction between "New" and "Learning"!

---

## 8. Example Scenarios

### Scenario 1: First Time Using Deck
```
Total cards: 10
New: 10 (all cards are new)
Due: 10 (new cards are always due)
Learning: 0
Mature: 0

Practice mode shows: 10 new cards
```

### Scenario 2: After Reviewing Some Cards
```
Total cards: 10
New: 4 (not yet reviewed)
Due: 4 (the 4 new cards)
Learning: 2 (reviewed, in learning phase, due)
Mature: 4 (reviewed, graduated, not due yet)

Practice mode shows: 4 new + 2 learning = 6 cards
Missing cards: 4 mature cards (will appear when due)
```

### Scenario 3: All Cards Reviewed
```
Total cards: 10
New: 0
Due: 2 (2 cards due for review)
Learning: 0
Mature: 8 (8 cards not due yet)

Practice mode shows: 2 due cards
Missing cards: 8 mature cards (will appear when their due_date arrives)
```

---

## 9. Why Cards "Disappear"

When you see "4 new + 2 learning = 6 cards" but total is 10:

**The missing 4 cards are:**
- **Mature cards** with `interval >= 1 day` and `due_date > now()`
- They're not shown because they're not due yet
- They'll appear when their `due_date` arrives
- This is normal Anki behavior!

**Example:**
- Card reviewed with "Easy" → `interval = 3 days`
- `due_date = now() + 3 days`
- Card disappears for 3 days
- After 3 days → `due_date <= now()` → appears as "Due" (red)

---

## 10. Summary

### Card Type Determination

```
┌─────────────────────────────────────────┐
│ Is there a user_progress entry?         │
│                                         │
│ NO → New Card (Blue)                    │
│ YES → Continue...                       │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Has last_review been set?               │
│                                         │
│ NO → New Card (Blue)                    │
│ YES → Continue...                       │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Is interval < 1 day?                    │
│                                         │
│ YES → Learning Card (Green)            │
│ NO → Continue...                       │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Is due_date <= now()?                   │
│                                         │
│ YES → Due Card (Red)                    │
│ NO → Mature Card (Not shown)           │
└─────────────────────────────────────────┘
```

### Priority in Practice Mode

```
Due Cards (Red)     → Priority 0 → Shown FIRST
Learning (Green)    → Priority 1 → Shown SECOND  
New Cards (Blue)    → Priority 2 → Shown LAST
Mature Cards        → Priority 3 → NOT SHOWN
```

### State Transitions

```
New → Learning → Mature → Due → (repeat)
         ↑                    │
         └────────────────────┘
         (if "Again" pressed)
```

This is how the entire SRS system works!

