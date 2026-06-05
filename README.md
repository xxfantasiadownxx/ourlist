# OurList

A clean, simple shared to-do list for the whole family. No login required.

---

## Features

### Members
- Add any number of family members, each with a name and personal color
- Each member gets their own tab
- Reorder member tabs from the Settings page

### Tasks
- Add tasks to any member from their tab
- Tap a task title to edit it
- Use ↑ / ↓ arrows to set the priority order of pending tasks

### Recurrence
| Type | Behavior |
|---|---|
| **One-time** | Appears once; deleted 4 hours after completion |
| **Daily** | Optional time; reappears every day at midnight |
| **Weekly** | Optional day of week; reappears at midnight on that day each week |
| **Monthly** | Choose a day of the month (1–31); reappears at midnight on that date each month |

### Completing tasks
- Tap the circle to the left of a task to mark it complete
- Completed tasks strike through, dim, and move to the bottom
- All completed tasks disappear from view after **4 hours**
- Uncheck a completed task at any time to restore it to active

### Recurring task lifecycle
- After completion, recurring tasks remain visible (crossed out) for **4 hours**
- After 4 hours they are hidden from view
- They automatically reset to active (incomplete) at **12:00 am** on their next due date:
  - **Daily** — resets every night at midnight
  - **Weekly** — resets at midnight on the set day of the week
  - **Monthly** — resets at midnight on the set day of the month

### Earned time
- Any task can be set to earn time on completion (e.g. clean room = 30 minutes)
- Enable "Earn time" when creating or editing a task and enter the number of minutes
- Earned time is displayed on the member's tab header (e.g. `1:30 earned`)
- Completing a task awards the time; unchecking it takes it back
- When a member has earned time, an **Exchange earned time** button appears at the bottom of their list
- Enter how many minutes to exchange; the balance updates immediately. Great for motivation in kids.

### Settings
- Access via the gear icon (⚙) in the tab bar
- Add, edit, rename, recolor, reorder, or remove members
- Removing a member also removes all their tasks

---

## Deployment

### Quick start
Download or copy the docker-compose.yml file then,
```bash
docker compose up -d
```
Open **http://localhost:3100** in your browser.

### Updating
```bash
docker compose pull && docker compose up -d
```

## Tech stack

- **Frontend** — React 18, served by nginx
- **Backend** — Node.js / Express, JSON file storage
- **Infrastructure** — Docker Compose, named volume for persistence
