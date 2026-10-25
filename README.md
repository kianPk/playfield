# Playfield

**Kian Zarandi** — interactive 3D portfolio world. Roll the ball, click boxes, open projects.

Live: [kianpk.github.io/playfield](https://kianpk.github.io/playfield/)

Based on [0xFloyd/Portfolio_2020](https://github.com/0xFloyd/Portfolio_2020) (MIT) — Three.js + Ammo.js physics playground, remixed with Kian's links and branding.

## Controls

- **Desktop:** arrow keys move the ball · click boxes to open links
- **Mobile:** tilt-only (DeviceOrientation) — no on-screen joystick · tap boxes

There is no welcome splash / start gate — the world loads straight into play once assets are ready.

## Highlights

- **Telegram** link tile in the world (`t.me/Kian_asli`)
- **Live visitor IP billboard** (phone-style sign painted from geo/IP lookup)
- Mobile tilt control without fullscreen gate or joystick UI

## Stack

- Three.js · Ammo.js · Webpack · Express (optional static server)

## Run

```bash
npm install
NODE_OPTIONS=--openssl-legacy-provider npm run build
npm run dev
# → http://localhost:8080
```

Or after build: `npm start`

## Customize

- Links → `src/resources/textures.js` (`URL.*`)
- 3D name / role → `src/app.js` (`loadFloydText` / `loadEngineerText`)
- Visitor IP screen → `src/resources/visitorIpScreen.js`

## Credit

Original interactive world by [0xFloyd](https://github.com/0xFloyd/Portfolio_2020). Remixed for Kian Zarandi (`@kianPk`).
