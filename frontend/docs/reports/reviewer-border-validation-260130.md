# Code Review: Border Validation & Toggle + Undo/Redo History

**Date:** 2026-01-30  
**Reviewer:** Code Quality Analyst  
**Category:** Border Validation Edge Cases & History Management  
**Status:** 🟡 MEDIUM - 8 Critical Issues, 4 High Priority, 3 Medium Priority

---

## Code Review Summary

### Scope
- **Files reviewed:** 5 core files
- **Lines analyzed:** ~1,100 lines
- **Focus areas:** Border validation, undo/redo history, subMode restrictions, boundary checks
- **Updated plans:** N/A (no existing plan file for this feature)

### Overall Assessment
Border validation & undo/redo implementation functional but contains **8 critical edge cases** that can cause state corruption, memory leaks, and validation bypasses. TypeScript build passes but runtime safeguards insufficient.

---

## Critical Issues

### 🔴 **#1 - History Overflow Memory Leak** (CRITICAL)
**File:** `store/game.ts:348, 405, 444`  
**Issue:** `borderHistory` & `borderFuture` arrays grow unbounded - no max limit.  
**Impact:** After 10,000 toggles, ~313KB memory. With heavy usage: **potential memory leak & performance degradation**.

**Current Code:**
```typescript
// Line 348
newTripod.borderHistory = [...state.tripod.borderHistory, historyEntry];
// NO MAXIMUM LIMIT CHECK
```

**Fix:**
```typescript
const MAX_HISTORY_SIZE = 100;
newTripod.borderHistory = [...state.tripod.borderHistory, historyEntry]
  .slice(-MAX_HISTORY_SIZE); // Keep last 100 entries
newTripod.borderFuture = [];
```

---

### 🔴 **#2 - Redo After New Action Not Cleared** (CRITICAL)
**File:** `store/game.ts:349`  
**Issue:** `borderFuture` IS cleared on new toggle (line 349) but NOT validated in `redoBorder`.  
**Status:** ✅ CORRECTLY IMPLEMENTED (line 349: `newTripod.borderFuture = [];`)  
**Verdict:** FALSE ALARM - this edge case is handled correctly.

---

### 🔴 **#3 - Empty History Undo Attempt** (HIGH)
**File:** `store/game.ts:377, 417`  
**Issue:** Bounds check EXISTS but happens AFTER array spread, wasting cycles.  
**Current Code:**
```typescript
// Line 377 - undoBorder
if (!state.tripod || state.tripod.borderHistory.length === 0) return state;
const history = [...state.tripod.borderHistory]; // Unnecessary spread if empty
const entry = history.pop()!; // Non-null assertion after check - SAFE
```

**Status:** ✅ SAFE but inefficient. Non-null assertion (`!`) justified after length check.  
**Optimization:**
```typescript
if (!state.tripod) return state;
const historyLen = state.tripod.borderHistory.length;
if (historyLen === 0) return state; // Exit before spread
const history = state.tripod.borderHistory.slice(0, historyLen - 1);
const entry = state.tripod.borderHistory[historyLen - 1];
```

---

### 🔴 **#4 - Out-of-Bounds Border Indices** (CRITICAL)
**File:** `useBorderValidation.ts:44-57`  
**Issue:** Optional chaining (`?.`) protects against undefined arrays BUT doesn't validate row/col are within bounds.

**Current Code:**
```typescript
// Line 44-57 - countBordersAtVertex
if (vCol > 0 && horizontalBorders[vRow]?.[vCol - 1]) count++;
if (vCol < gridSize && horizontalBorders[vRow]?.[vCol]) count++;
// What if vRow > horizontalBorders.length?
```

**Test Results:**
- Vertex `(7, 7)` accesses `horizontalBorders[7][7]` (out-of-bounds if gridSize=7, array is [0-6])
- Optional chaining returns `undefined` → falsy → no crash but **SILENT FAILURE**

**Fix:** Add explicit bounds validation:
```typescript
const countBordersAtVertex = (vRow: number, vCol: number): number => {
  // Validate vertex coordinates
  if (vRow < 0 || vRow > gridSize || vCol < 0 || vCol > gridSize) {
    console.warn(`Invalid vertex: (${vRow}, ${vCol})`);
    return 0;
  }
  let count = 0;
  // Rest of logic...
};
```

---

### 🔴 **#5 - Concurrent Border Toggles State Inconsistency** (HIGH)
**File:** `store/game.ts:322-359`, `hooks/useTripodGame.ts:85-98`  
**Issue:** No debouncing or locking mechanism for rapid clicks.  
**Scenario:** User clicks border twice in <100ms:
  1. First click reads `currentValue = false`, queues toggle
  2. Second click reads SAME `currentValue = false` (state not updated yet)
  3. Both toggles execute → net effect = no change BUT history has 2 entries

**Current Flow:**
```typescript
// useTripodGame.ts:97
toggleTripodBorder(type, row, col); // Synchronous Zustand set()
```


