# Bot Showdown 3D

An interactive 3D poker-bot tournament broadcast for a Claude Code workshop. It has a low-poly bar scene, tournament controls, a live leaderboard, play-by-play, and five reusable bot character designs.

Unlike the original exported artifact, this is a runnable Node project. The server owns tournament session metadata and provides an API surface that can be replaced with real submitted bots or an event worker.

## Run it

Requires Node.js 20 or newer.

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000). For automatic server restarts while developing, run `npm run dev`.

## What changed from the artifact

- A minimal, dependency-free Node server serves the app safely and exposes health, roster, session, and event-stream endpoints.
- The browser creates a server-backed tournament session on launch.
- Every seated bot now displays both hole cards in a compact, color-coded badge above its head after the deal. Folded or eliminated players’ cards disappear.
- Project metadata, run instructions, and a clean Git repository make it ready to publish and extend.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Server status and version |
| `GET /api/bots` | Workshop bot roster |
| `POST /api/tournaments` | Create a tournament session; accepts optional JSON `{ "seed": number }` |
| `GET /api/tournaments/:id` | Read a session |
| `GET /api/tournaments/:id/events` | Server-sent event stream for future live engine events |

The visual tournament currently uses the existing deterministic browser engine. A workshop backend can replace it by publishing `hand`, `act`, `street`, `win`, and `bust` events to the session stream while retaining the same 3D broadcast client.

## Workshop extension ideas

Put bot strategies behind a small `act(state)` contract, run them in a sandboxed worker, validate timeouts and chip conservation server-side, and broadcast only validated events. That makes the strongest algorithm non-obvious: students can explore risk, opponent modeling, pot odds, and tournament scoring rather than all converging on one hard-coded line.
