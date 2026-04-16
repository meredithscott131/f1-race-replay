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
 
### Prerequisites
- Python 3.10+ with a virtual environment
- Node.js 18+
**1. Install server dependencies**
```bash
cd server
pip install -r requirements.txt
```
 
**2. Pre-process a race**
 
Fetches telemetry from FastF1 and saves it to `server/local_data/{year}_{round}/`:
```bash
python preprocess_local.py --year 2024 --round 1
 
# or process every round in a season:
python preprocess_local.py --year 2024 --all
```
> This only needs to be run once per race. Subsequent runs are skipped unless `--force` is passed.
 
**3. Start the local API server**
 
In a dedicated terminal:
```bash
python local_server.py
```
The server runs on `http://localhost:8001`. Visit `http://localhost:8001/health` to confirm it is running and see which races are available.
 
**4. Configure the frontend**
 
Create `client/.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_USE_LOCAL_API=true
VITE_LOCAL_API_URL=http://localhost:8001
```
> The Supabase credentials are still required because the Driver Summary panel reads cross-season history from Supabase.
 
**5. Start the frontend**
 
In a separate terminal:
```bash
cd client
npm install
npm run dev
```