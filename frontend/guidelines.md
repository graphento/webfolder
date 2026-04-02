## Структура фронта (референс)
```txt
site/
├── _shared/
│   ├── core/
│   │   ├── state-bus.js      # Cross-page communication via localStorage events
│   │   ├── dom-utils.js      # Pure DOM helpers (no framework)
│   │   └── api.js            # Fetch wrapper (abort controllers + retries)
│   ├── components/           # Reusable across pages
│   │   ├── tabs.js
│   │   ├── modal.js
│   │   └── carousel.js
│   ├── animations/           # Cross-page animation library
│   │   ├── core.js           # RAF loop, easing functions, timeline
│   │   ├── presets/          # Ready-to-use effects
│   │   │   ├── fade.js
│   │   │   ├── slide.js
│   │   │   └── scale.js
│   │   └── triggers/         # Scroll, hover, viewport observers
│   │       ├── scroll.js
│   │       └── intersection.js
│   └── css/
│       ├── reset.css
│       ├── tokens.css        # CSS custom properties only
│       └── grid.css
├── dashboard/                # Team A owns
│   ├── index.html            # Full page
│   ├── index.js              # Page-specific controller
│   ├── index.css
│   ├── charts/               # Sub-modules for this page only
│   └── widgets/              # Parallel work inside same page
├── checkout/                 # Team B owns
│   ├── index.html            # Completely different structure
│   ├── index.js
│   ├── index.css
│   ├── steps/                # Wizard pattern
│   └── validation/
└── products/                 # Team C owns
    ├── index.html
    ├── detail/               # Can share JS but different DOM structure
    │   └── index.html
    ├── products.js
    └── products.css
```