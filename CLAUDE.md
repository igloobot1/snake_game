# CLAUDE.md - Snake 3D Project Context

## Overview
A 3D Snake game built with Three.js, playable in the browser.

## Architecture
- `index.html` — Main HTML with inline styles, title screen, game overlay, and UI
- `game3d.js` — Three.js-based 3D game logic (ES module, imports Three.js from CDN)
- `game.js` — Legacy 2D canvas version (not currently used by index.html)
- `style.css` — Legacy styles for the 2D version

## Key Details
- Uses ES module import map for Three.js v0.170.0 from CDN
- Grid: 20x20, speed increases with score
- High scores stored in localStorage (`snake3d_hi`)
- Title screen shown on first load (id: `title-screen`), game over overlay (id: `overlay`) shown after death
- Mobile-friendly: touch/swipe controls, responsive viewport

## Sound System
- Uses Web Audio API to synthesize sounds programmatically (no external files)
- Sound effects: eat food (ascending beeps), game over (descending sawtooth), start game (rising fanfare), direction change (soft tick)
- Mute/unmute toggle button (🔊/🔇) fixed at top-right corner
- AudioContext created on first user interaction to comply with browser autoplay policies

## Flow
1. Title screen appears on load (z-index 30, above everything)
2. Press Space/Enter/Tap dismisses title screen and starts game
3. Game over shows overlay with score; Space/Tap restarts
