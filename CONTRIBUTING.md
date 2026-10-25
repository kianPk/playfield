# Contributing

## Develop

```bash
npm ci
NODE_OPTIONS=--openssl-legacy-provider npm run build
npm run dev
```

Webpack 4 needs `NODE_OPTIONS=--openssl-legacy-provider` on modern Node.

## Guidelines

- Keep mobile tilt path working without reintroducing a joystick UI or splash gate
- Prefer updating `docs/` after a production build when changing the Pages demo
- Note user-visible changes in `CHANGELOG.md`
