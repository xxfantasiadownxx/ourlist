# OurList

A clean, simple shared family to-do list. No login required.

## Features

- **Members** — Add any family member with a personal color; each gets their own tab.
- **Tasks** — One-time tasks or daily / weekly / monthly recurring chores.
- **Due dates** — Assign a date to any one-time task; overdue tasks are flagged.
- **Check-off** — Tap the circle to complete a task. It dims, strikes through, and sinks to the bottom. Auto-deletes after 8 hours. Uncheck anytime to restore it.
- **Ordering** — Use the ↑ / ↓ arrows to set priority order for pending tasks.
- **Edit** — Tap any active task title to edit it.
- **Persistent** — All data is stored server-side in a Docker volume (JSON file), with localStorage as an offline fallback.

## Quick Start

```bash
# Clone / copy this folder, then:
docker compose up -d --build
```

Open **http://localhost** in your browser.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Backend API port |
| `DATA_FILE` | `/data/ourlist.json` | Where data is stored inside the backend container |

To expose on a different host port, edit the `ports:` line in `docker-compose.yml`:
```yaml
ports:
  - "8080:80"   # serve on port 8080
```

## Data

All data is stored in a Docker named volume (`ourlist-data`). To back up:
```bash
docker run --rm -v ourlist-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/ourlist-backup.tar.gz /data
```

To restore:
```bash
docker run --rm -v ourlist-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/ourlist-backup.tar.gz -C /
```

## Tech Stack

- **Frontend**: React 18, served by nginx
- **Backend**: Node.js / Express, JSON file storage
- **Deployment**: Docker Compose (two containers + one named volume)
