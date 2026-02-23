# 🏎️ F1 Race Replay

**Still Active in Development**

A Formula 1 race visualisation web app that turns accurate simulation data into an interactive, explorable, and playable experience. Built with a React/TypeScript frontend and a Python backend powered by the FastF1 telemetry library.

> **Forked from [IAmTomShaw/f1-race-replay](https://github.com/IAmTomShaw/f1-race-replay).**
> This fork migrates the project to a full-stack React + TypeScript architecture while preserving the original Python data pipeline.

## Features

- **Accurate circuit rendering** — outer and inner track boundaries drawn from real coordinate data
- **Animated race replay** — driver positions interpolated and rendered frame-by-frame across the circuit
- **Leaderboard** — live leaderboard rendering, including driver positions, timing, and lap count
- **Playback Controls** - controls to fast forward/back, play/pause, and increase the speed of the race
- **DRS zone highlighting** — active DRS zones overlaid in green on the track boundary
- **Responsive UI** — scales and re-centers automatically on window resize

## Screenshots
<<<<<<< HEAD
![Screenshot](shared\images\Screenshot1.png)
=======
<img src="https://github.com/meredithscott131/f1-race-replay/blob/react-setup/shared/images/Screenshot1.png" alt="Alt text" width="500">
>>>>>>> 049704c128117ca5c9683c81fc0ae5f6a08e7e23

## Wireframes
<img src="https://github.com/meredithscott131/f1-race-replay/blob/react-setup/shared/images/Wireframe1.png" alt="Alt text" width="500">

<img src="https://github.com/meredithscott131/f1-race-replay/blob/react-setup/shared/images/Wireframe2.png" alt="Alt text" width="500">

## Running Locally

**Backend**

```bash
cd server
pip install -r requirements.txt
python run.py
```

**Frontend**

```bash
cd client
npm install
npm run dev
```

## Future Development Tasks
1. Race Selection (home) screen​

2. Reduce loading time (~120 seconds) of race simulation​

3. Driver filtering​

4. Driver name overlay toggling​

5. Race event popup system (safety car, red flags, etc.)​

6. Weather component​

7. Expanded simulation view​

8. Advanced loading screen with animations​

9. Game feature (ex. remix races with drivers from different years)
