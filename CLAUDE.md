# Siddhi

Outbreak early-warning system for mass gatherings. Hackathon project, 10-day timeline.

**Before doing anything:**
1. Read `PROJECT.md` — full spec, scope tiers, design rules, data model. Follow it strictly.
2. Read `PROGRESS.md` — current state, what's done, what's next. Update it after finishing any task.

**Hard rules (details in PROJECT.md):**
- Build only the current tier. No unrequested features.
- Never block a doctor; entry form stays ≤10 seconds; detection stays explainable z-score (no ML).
- No pilgrim login/app. No real auth. No heavy UI frameworks.
- Simulator must write through the same API as the real app.
- App code lives in `/app`, simulator in `/simulator`, seed/config data in `/app/src/config`.
