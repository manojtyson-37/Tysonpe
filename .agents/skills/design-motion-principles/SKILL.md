---
name: design-motion-principles
description: "Design motion principles skill based on Emil Kowalski, Jakub Krehel, and Design Spells. Guides animation timing, easing curves, physics springs, and micro-interactions."
---

# Design Motion Principles

Adds intentional motion, timing, and tactile feedback to web interfaces.

## 1. Core Principles
- **Speed & Restraint**: Animations exist to communicate state, not entertain. Utility interactions must complete in under 220ms.
- **Physics Springs for Overlays**: Modals, dropdowns, and notifications should use spring easing curves to feel natural and physical.
- **Micro-Delight**: Interactive elements must acknowledge touch and clicks with tactile depressions.

## 2. Easing Curves
```css
/* Quick snaps for buttons, links, hover fills */
--ease-snappy: cubic-bezier(0.2, 0, 0, 1);

/* Smooth entrance for dialogs, modals, and sheets */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);

/* Spring physics for popovers and copy-feedback */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

## 3. Durations
- Hover states & micro-toggles: `150ms`
- Overlays, dialogs, drawers: `220ms`
- Spring bounces: `320ms`

## 4. Micro-Interactions (Design Spells)
1. **Button Depress**: Always add `active:scale-[0.98] transition-transform duration-150 ease-out`.
2. **Copy Feedback**: Switch copy icon to emerald checkmark with a `scale-110 -> scale-100` spring transition.
3. **Live Indicator**: Use an emerald pulsing dot (`relative flex h-2 w-2`) with an expanding ping ring for live statuses.
4. **Countdown Timers**: Use `font-mono tabular-nums` to eliminate layout shift during second-by-second updates.

## 5. Accessibility
Always respect reduced motion preferences:
```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
