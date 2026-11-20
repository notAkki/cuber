# Cuber

A focused 3×3 speedcubing timer built with Next.js, React, TypeScript, and Tailwind CSS.

Use Node.js 22.3 or newer.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Press Space to fade the surrounding controls, release to start, and press Space again to stop. The timer surface also supports mouse and touch. The palette offers Light and Dark themes and accent colors. The eye icon toggles the running clock.

The Next.js scramble route uses [cubing.js](https://js.cubing.net/cubing/scramble/) to generate 3×3 random-state practice scrambles. The cube net uses white on top and green in front. Official competitions use the WCA’s current official scramble program.

Solves and preferences live in browser storage. Click or pull the floating left and right controls to toggle solve history and analytics. Select a solve to review its scramble or add notes. The latest solve has quick actions for +2, DNF, and deletion. History includes CSV export. Average of 5 and average of 12 drop the fastest and slowest results from the latest window. A DNF counts as a slowest result, so two or more DNFs yield a DNF average. The mean, time trend, and time distribution use completed results with penalties applied.

```sh
npm run build
npm start
```
