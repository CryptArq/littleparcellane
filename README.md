# Little Parcel Lane

A cozy miniature delivery arcade game built with HTML, CSS, Canvas, and JavaScript. No dependencies or build step required.

## Play

Open `dist/index.html` in a browser, or run `node preview.cjs` and visit http://127.0.0.1:4173.

- **Arrow keys:** find parcels by entering their sequences, then choose delivery locations.
- **WASD:** rotate a parcel to find its shipping label.
- **Space:** scan a visible label.
- **P / Escape:** pause.
- Enable sound in the header for musical feedback.

Complete every parcel for a house to count a stop. Meet the stage quota to unlock bonus time, then visit the depot for upgrades and optional challenges. Five stages advance each district: neighborhood, suburb, and city.

The garage includes shift, cargo, label orientation, and three-tier scanner upgrades. Bonus challenges can be accepted, skipped, or rerolled with earned tips. Best scores are stored locally in the browser.

## Checks

Requires Node.js. Run:

```sh
node check-sorting.cjs
node check-render.cjs
```

These check sorting, label visibility, scanner tiers, placement, stop quotas, purchases, challenge rewards, and scene rendering using lightweight browser mocks. They do not replace visual browser testing.
