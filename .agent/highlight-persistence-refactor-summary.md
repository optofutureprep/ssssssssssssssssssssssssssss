# Highlight Persistence Refactor Summary

## Objective
Refactor the highlight persistence logic from question-number-based to `passageId`-based for the Reading Comprehension exam.

## Changes Made

### 1. Added `getCurrentPassageKey()` Helper Function
**Location:** `script.js` (line ~2819)

```javascript
function getCurrentPassageKey(index = currentQuestionIndex) {
    if (!currentSubject || currentTestIndex === null || index === null) return null;
    
    const test = allTestData[currentSubject] && allTestData[currentSubject][currentTestIndex];
    const question = test && test[index];
    
    if (question && question.passageId) {
        return `${currentSubject}-${currentTestIndex}-passage-${question.passageId}`;
    }
    
    // Fallback for old structure
    const passageIndex = Math.floor(index / 17);
    return `${currentSubject}-${currentTestIndex}-passage-${passageIndex}`;
}
```

**Purpose:** 
- Generates passage keys based on `passageId` when available
- Falls back to question-number-based logic for backward compatibility
- Ensures highlights are grouped by passage, not by question number

### 2. Updated `createHighlight()` Function
**Location:** `script.js` (lines ~3105-3140)

**Changes:**
- Replaced hardcoded passage index calculation with `getCurrentPassageKey()`
- Now uses: `const passageKey = getCurrentPassageKey();`
- Instead of: `const passageIndex = Math.floor(currentQuestionIndex / 17);`

**Impact:** Highlights created within passages are now correctly associated with the passage ID.

### 3. Updated `removeHighlight()` Function
**Location:** `script.js` (lines ~3170-3189)

**Changes:**
- Replaced hardcoded passage index calculation with `getCurrentPassageKey()`
- Ensures removed highlights update the correct passage state

### 4. Updated `reattachHighlightButtons()` Function
**Location:** `script.js` (lines ~3339-3358)

**Changes:**
- Replaced hardcoded passage index calculation with `getCurrentPassageKey()`
- Ensures strikethrough functionality works with passage-based keys

### 5. Updated `clearHighlightsAndStrikethroughs()` Function
**Location:** `script.js` (lines ~3229-3245)

**Changes:**
- Uses `getCurrentPassageKey(i)` for each question index
- Properly clears passage highlights based on passage ID
- Added null check before removing from localStorage

### 6. Updated `loadHighlightsFromLocalStorage()` Function
**Location:** `script.js` (lines ~3278-3307)

**Changes:**
- Uses `getCurrentPassageKey(i)` when loading passage highlights
- Correctly loads highlights for each passage based on passage ID

### 7. Added `capturePassageState()` Helper Function
**Location:** `script.js` (line ~3195)

```javascript
function capturePassageState(passageElement) {
    if (!passageElement) return null;
    
    // Capture all paragraph HTML to preserve highlights
    const paragraphs = passageElement.querySelectorAll('p');
    if (paragraphs.length === 0) return null;
    
    return Array.from(paragraphs).map(p => p.innerHTML);
}
```

**Purpose:**
- Captures the current HTML state of all paragraphs in a passage
- Preserves highlight markup for persistence
- Returns an array of paragraph HTML strings

## How It Works

### Before (Question-Number Based)
- Highlights were tied to question numbers (e.g., questions 1-17 for passage 1)
- Passage key: `${subject}-${testIndex}-passage-${Math.floor(questionIndex / 17)}`
- Problem: If question order changed, highlights would appear on wrong passages

### After (Passage-ID Based)
- Highlights are tied to passage IDs from `exam-data.js`
- Passage key: `${subject}-${testIndex}-passage-${question.passageId}`
- Benefit: Highlights persist correctly regardless of question order

## Backward Compatibility

The refactor maintains backward compatibility:
- If a question has `passageId`, it uses that
- If no `passageId` exists, falls back to the old calculation method
- Existing highlights from old structure will continue to work

## Testing Recommendations

1. **Create highlights on different passages**
   - Navigate through questions in passage 1
   - Create highlights
   - Navigate to passage 2
   - Verify passage 1 highlights are cleared
   - Create new highlights in passage 2

2. **Test persistence**
   - Create highlights in passage 1
   - Navigate to passage 2
   - Navigate back to passage 1
   - Verify highlights are restored

3. **Test across question boundaries**
   - Create highlights on question 5 (passage 1)
   - Navigate to question 10 (passage 1)
   - Verify highlights persist
   - Navigate to question 18 (passage 2)
   - Verify passage 1 highlights are cleared

4. **Test completed exam review**
   - Complete an exam with highlights
   - Review the exam
   - Verify all highlights are correctly restored

## Files Modified

- `script.js` - All highlight persistence logic updated

## Status

✅ **Complete** - All highlight functions now use passage-based persistence
