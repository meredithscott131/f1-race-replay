# 🏎️ F1 Race Replay

🔗 **[View Live App](https://meredithscott131.github.io/f1-race-replay)**

> **Forked from [IAmTomShaw/f1-race-replay](https://github.com/IAmTomShaw/f1-race-replay).**  
> This fork migrates the project to a full-stack React + TypeScript architecture while preserving the original Python data pipeline.

A Formula 1 race visualisation web app that transforms real telemetry data into an interactive, frame-by-frame replay experience. Built with a React/TypeScript frontend and a Python backend powered by the FastF1 library and Supabase.

> ⚠️ **Active development** — features and data availability are subject to change.

## Screenshots

### Race Selection
<img src="https://github.com/meredithscott131/f1-race-replay/blob/main/shared/images/race-selection.png" alt="Race selection screen">

### Race Dashboard
<img src="https://github.com/meredithscott131/f1-race-replay/blob/main/shared/images/race-dashboard.png" alt="Race dashboard screen">

## Features

**Leaderboard**
- Live driver positions with gap times, tyre compounds, and lap counter
- Toggle between interval (to car ahead) and leader gap display modes
- Click any row to focus that driver on the track canvas

**Driver Summary Panel**
- Per-driver result history at the current circuit across all available seasons

**Track Canvas**
- Animated driver positions at 25 FPS with smooth interpolation
- DRS zone overlays, OUT status indicators, and leader star marker
- Scroll to zoom, click-and-drag to pan, click a driver dot to follow them

**Playback Controls**
- Play, pause, restart, and ±250 frame skip
- Variable speed (0.25× – 16×)
- Lap-by-lap seeking via input or previous/next buttons
- Track status segments (flags, safety car) overlaid on the progress bar

**Session Info**
- Live weather strip (air temp, track temp, humidity, wind speed)
- Race event popup notifications for flags and safety car periods

## Known Limitations

- **Data availability** — due to Supabase free-tier storage limits, the app currently holds 9 races across the 2022–2024 seasons.
- **First and last lap positions** — position accuracy is reduced on lap 1 and the final lap. This is a known issue inherited from the original project and is actively being investigated.

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