# Aura — breathe, focus, sleep

A calm, private wellbeing sanctuary that runs entirely in your browser.
Live: https://kumarnikhildeveloperaccount.github.io/aura/

## Features
- **Guided breathing**: an animated canvas orb with a particle field. Particles flow into the orb as you breathe in and out of it as you breathe out. Four patterns: Box (4·4·4·4), 4·7·8, Coherent (5.5 breaths a minute) and the Physiological sigh. Haptics use `navigator.vibrate` where the browser supports it, and soft tones are synthesised.
- **Meditation timer**: presets or a custom length, interval bells and a synthesised singing bowl (inharmonic partials with beating). Five guided scripts can be read aloud with the Web Speech API. If speech isn't available, each line is highlighted in turn instead.
- **Soundscape mixer**: rain, ocean, wind, forest birds, fire crackle, a cosmic pad, and brown, pink and white noise. Every sound is generated live with Web Audio. There are presets, a master volume, a binaural-beat toggle with a headphone warning, and a sleep timer that fades sound out over the last minute.
- **Focus mode**: a Pomodoro timer (focus, short break, long break) with generative lo-fi (chords, bass, drums, vinyl hiss, tape wobble) and a visualiser.
- **Journal**: weather-style mood check-ins, a 14-day SVG chart, a streak count, a gratitude jar, and JSON export, import (merge) and clear.
- **Move**: daily affirmations, which can be read aloud, and three stretch routines shown by an SVG stick figure.
- **Night sky**: procedural stars, the Milky Way, aurora curtains, a lake reflection, pine silhouettes and shooting stars you can tap. There is also a guided "breathe with the aurora" mode and a full-screen mode.
- **Themes**: Aurora (default), Ocean, Forest, Midnight Ember and Sunrise (a light theme).
- **Background**: a WebGL fragment shader (fbm domain warping) that falls back to Canvas 2D. It adapts its resolution to the device's power.

## Technical notes
- Plain HTML, CSS and JS with no build step, no libraries and no CDNs. All paths are relative.
- Data is stored in `localStorage` under keys prefixed `aura:`. There is no backend, tracking or sign-up.
- Audio is muted until you turn it on. The audio context is unlocked on the first gesture, as iOS requires.
- Canvas DPR is capped at 2. Particle counts drop on low-power devices, and frame-time monitoring lowers resolution automatically.
- The site respects `prefers-reduced-motion`, safe-area insets and `100dvh` (with a `100vh` fallback). Touch targets are at least 44px and pointer events are used throughout.

## Files
```
index.html  404.html  favicon.svg  manifest.webmanifest  README.md
css/base.css  css/components.css  css/views.css  css/polish.css
js/util.js  js/audio.js  js/soundscape.js  js/lofi.js  js/bg.js  js/breath.js
js/meditate.js  js/sounds.js  js/focus.js  js/journal.js  js/move.js  js/night.js  js/app.js
```

## Easter egg
Tap the logo seven times, or type `namaste`.

## Disclaimer
Aura is not medical advice. India: Tele-MANAS **14416**. International: https://findahelpline.com

---
Designed & built by Kumar Nikhil · [Portfolio](https://kumarnikhildeveloperaccount.github.io/) · [LinkedIn](https://www.linkedin.com/in/kumar-nikhil-1000a9192/) · [Email](mailto:nkashyapnikhilnk@gmail.com)

With gratitude to God — Om Namah Paarvati Pateh, Har Har Mahadev. May God bless you and everyone.
