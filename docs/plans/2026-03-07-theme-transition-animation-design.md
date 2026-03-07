# Theme Transition Animation Design

**Date:** 2026-03-07
**Status:** Approved

## Overview

Animate the dark/light mode toggle with a circular ripple that expands from the ThemeToggle button position, using the native View Transition API.

## Approach

View Transition API (`document.startViewTransition()`) with a `clip-path` circle expanding from the button's coordinates. Zero external dependencies.

## Files Changed

| File | Change |
|------|--------|
| `src/components/layout/ThemeToggle.tsx` | Capture button position, wrap `setTheme()` in `startViewTransition()` |
| `src/app/globals.css` | Add `::view-transition-old/new` CSS rules for clip-path animation |

## Animation Spec

- **Duration:** 400ms
- **Easing:** `ease-in-out`
- **Shape:** Circle expanding from button center
- **Start radius:** 0
- **End radius:** diagonal of viewport (ensures full coverage)
- **Fallback:** Instant theme change if View Transition API not supported

## Behavior

- Click ThemeToggle → capture `(x, y)` from `getBoundingClientRect()`
- Store coordinates in CSS custom properties `--x`, `--y` on `document.documentElement`
- `startViewTransition()` calls `setTheme()` inside its callback
- CSS `clip-path: circle(0 at var(--x) var(--y))` → `circle(100vmax at var(--x) var(--y))`
- Dark→Light: new (light) layer expands over old (dark)
- Light→Dark: new (dark) layer expands over old (light)
