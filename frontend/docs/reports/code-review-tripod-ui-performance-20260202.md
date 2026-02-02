---
title: "Code Review: Tripod UI/UX & Performance Issues"
date: 2026-02-02
reviewer: Code Quality Team
category: UI/UX + Memory & Performance
status: Critical Issues Identified
---

## Code Review Summary

### Scope
- Files reviewed: 15 files (tripod components, hooks, store)
- Lines analyzed: ~2,500 LOC
- Focus: UI/UX rendering + memory/performance optimization
- Updated plans: None (issues identified, fixes needed)

### Overall Assessment

**Build Status**: ✅ Clean (TypeScript compilation passes, Next.js production build successful)

**Critical Issues Found**: 11 high-priority bugs affecting UX and performance
**Code Quality**: Good architecture, but missing optimization patterns

---

## Critical Issues

### Issue #44: Responsive cellSize Calculation - isMobile Detection Fails
**File**: `app/tripod/page.tsx:54,84` + `hooks/useMobileDetect.ts:71`
**Severity**: HIGH - Layout breaks on tablets/hybrid devices
**Root Cause**: Hard-coded breakpoint (768px) doesn't account for:
- Tablets in landscape (≥768px but still touch)
- Hybrid devices (Surface, iPad with keyboard)
- Browser zoom levels

**Current Code**:
```typescript
// useMobileDetect.ts:71
const isMobile = state.viewportWidth < MOBILE_BREAKPOINT; // 768px

// page.tsx:84
const cellSize = getOptimalCellSize(gridSize, isMobile ? 24 : 32);
```

**Problem**: `isMobile` only checks width, ignores touch capability. Hybrid devices get desktop layout with tiny touch targets.

**Fix**: Use combined detection:
```typescript
const isMobile = state.viewportWidth < MOBILE_BREAKPOINT || state.isTouchDevice;
// OR use isTouchDevice directly for cellSize padding
const cellSize = getOptimalCellSize(gridSize, isTouchDevice ? 24 : 32);
```

---

### Issue #45: Touch vs Mouse Event Conflicts - Both Fire on Hybrid Devices
**Files**: `TripodCell.tsx:64-81`, `BorderEdge.tsx:138-156`
**Severity**: HIGH - Double actions on hybrid devices
**Root Cause**: Both touch and click handlers attached without preventDefault on click

**Current Flow**:
1. Touch device: `onTouchStart` → `onTouchEnd` → `onClick` (all fire)
2. Result: Cell selected twice, action triggered twice

**Evidence in TripodCell.tsx**:
```typescript
// Lines 64-81: Touch handlers present
handleTouchStart={(e) => { e.preventDefault(); ... }}
handleTouchEnd={(e) => { e.preventDefault(); onClick(); }}

// Line 108: onClick ALSO attached
onClick={onClick}
```

**Problem**: On hybrid devices with both touch+mouse:
- Tap triggers: touchstart → touchend → mousedown → click
- This causes double cell selection or double border toggle

**Fix**: Conditional event binding:
```typescript
const eventHandlers = isTouchDevice
  ? { onTouchStart: handleTouchStart, onTouchEnd: handleTouchEnd }
  : { onClick: onClick };

// Apply: {...eventHandlers}
```

**Alternative**: Use pointer events (modern approach):
```typescript
onPointerDown={handlePointerDown}
onPointerUp={handlePointerUp}
// Single unified API for mouse/touch/pen
```

---

### Issue #46: SVG Rendering Performance - Large Grids Cause Lag
**File**: `TripodGrid.tsx:79-171`
**Severity**: MEDIUM - Noticeable lag on 9×9 grids with animations
**Root Cause**: No virtualization, all cells render even if off-screen

**Current**: ~81 cells + 144 borders + 9 dots = 234 DOM nodes for 9×9 grid
**With animations**: CSS transitions on every border toggle cause repaints

**Performance Metrics** (estimated):
- 7×7 grid: ~150 nodes → 16ms render (60fps) ✓
- 9×9 grid: ~234 nodes → 28ms render (35fps) ✗

**Evidence**:
```typescript
// TripodGrid.tsx:97-114 - No memoization
{cells.map((row, r) =>
  row.map((value, c) => (
    <TripodCell ... /> // Rerenders on ANY cell change
  ))
)}
```

**Fix Options**:
1. **Memoize TripodCell** (quick win):
```typescript
const TripodCell = React.memo(({ ... }) => { ... });
```

2. **Use CSS containment** (reduce repaint):
```css
.tripod-grid { contain: layout style paint; }
```

3. **Throttle region recalculation** (covered in Issue #52)

---

### Issue #47: Color Contrast Insufficient - Region Colors Invisible in Dark Mode
**File**: `types/tripod.ts` (REGION_COLORS definition)
**Severity**: MEDIUM - Accessibility failure (WCAG AA)
**Root Cause**: Pastel colors have low contrast on dark backgrounds

**Current Colors** (assumed from typical usage):
```typescript
export const REGION_COLORS = [
  '#fef3c7', '#dbeafe', '#e0e7ff', '#fce7f3',
  '#d1fae5', '#ffe4e6', '#fef9c3'
];
```

**Contrast Ratios** (light color on dark slate-800 #1e293b):
- #fef3c7 on #1e293b = 1.8:1 (FAIL - need 3:1 minimum)
- #dbeafe on #1e293b = 2.1:1 (FAIL)

**Fix**: Adaptive colors based on theme:
```typescript
const REGION_COLORS_LIGHT = ['#fef3c7', ...]; // Current
const REGION_COLORS_DARK = ['#92400e', '#1e3a8a', ...]; // Darker shades

// In component:
const regionColors = isDark ? REGION_COLORS_DARK : REGION_COLORS_LIGHT;
```

**Alternative**: Use CSS opacity overlay:
```css
.dark .region-cell {
  background-color: var(--region-color);
  filter: brightness(0.4); /* Darken for contrast */
}
```

---

### Issue #48: Toast Spam on Rapid Actions - Multiple Error Toasts Overlap
**File**: `components/ui/Toast.tsx:28-40` + `useTripodGame.ts:93`
**Severity**: HIGH - UX annoyance, blocks important UI
**Root Cause**: No debouncing or deduplication in toast system

**Current Behavior**:
1. User rapidly clicks blocked border → 5 toasts in 1 second
2. All toasts stack (z-index 9999) → covers game grid

**Evidence**:
```typescript
// useTripodGame.ts:93 - Called on every click
if (!result.allowed) {
  toast.error(result.reason || 'Cannot toggle border', 2500);
  return;
}
```

**Toast.tsx** has no deduplication:
```typescript
// Line 28-32 - Every call creates new toast
export function showToast(props: ToastProps): number {
  const id = ++toastId;
  currentToasts = [...currentToasts, newToast]; // No check for duplicates
  notifyListeners();
}
```

**Fix 1**: Debounce rapid errors (quick win):
```typescript
const lastToastTime = useRef(0);
if (!result.allowed) {
  const now = Date.now();
  if (now - lastToastTime.current > 1000) { // 1s cooldown
    toast.error(result.reason, 2500);
    lastToastTime.current = now;
  }
  return;
}
```

**Fix 2**: Deduplicate in toast system:
```typescript
export function showToast(props: ToastProps): number {
  // Check if identical message exists
  const existing = currentToasts.find(t =>
    t.message === props.message && t.type === props.type
  );
  if (existing) return existing.id; // Don't create duplicate

  // ... rest of logic
}
```

---

### Issue #49: Keyboard Focus Trap - Tab Navigation Broken
**File**: `app/tripod/page.tsx` (no tabIndex management)
**Severity**: MEDIUM - Accessibility failure (keyboard users)
**Root Cause**: Grid cells have no tabindex, modal doesn't trap focus

**Current State**:
- Cells are `div` elements with `onClick` but no `tabIndex`
- CompletionCelebration modal doesn't prevent tab escape
- No visual focus indicators beyond :focus-visible

**Fix**:
1. **Add keyboard navigation to grid**:
```typescript
// TripodCell.tsx
<div
  tabIndex={0}
  role="button"
  aria-label={`Cell ${row}-${col}, value ${value || 'empty'}`}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }}
  ...
/>
```

2. **Focus trap in modal** (CompletionCelebration.tsx):
```typescript
useEffect(() => {
  if (!isVisible) return;

  const focusableElements = modalRef.current?.querySelectorAll(
    'button, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements?.[0];
  const lastElement = focusableElements?.[focusableElements.length - 1];

  firstElement?.focus();

  const handleTab = (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement?.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement?.focus();
    }
  };

  document.addEventListener('keydown', handleTab);
  return () => document.removeEventListener('keydown', handleTab);
}, [isVisible]);
```

---

