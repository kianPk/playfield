# Playfield

**Kian Zarandi** — interactive 3D portfolio world. Roll the ball, click boxes, open projects.

Live: [kianpk.github.io/playfield](https://kianpk.github.io/playfield/)

Based on [0xFloyd/Portfolio_2020](https://github.com/0xFloyd/Portfolio_2020) (MIT) — Three.js + Ammo.js physics playground, remixed with Kian's links and branding.

## Controls

- **Desktop:** arrow keys move the ball · click boxes to open links
- **Mobile:** on-screen joystick · tap boxes

## Stack

- Three.js · Ammo.js · Webpack · Express (optional static server)

## Run

```bash
npm install
npm run build
npm run dev
# → http://localhost:8080
```

Or after build: `npm start`

## Customize

- Links → `src/resources/textures.js` (`URL.*`)
- 3D name / role → `src/app.js` (`loadFloydText` / `loadEngineerText`)
- Start screen copy → `index.html`

## Credit

Original interactive world by [0xFloyd](https://github.com/0xFloyd/Portfolio_2020). Remixed for Kian Zarandi (`@kianPk`).
