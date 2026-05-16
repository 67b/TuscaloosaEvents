# AGENTS.md

## Purpose
This repository is an educational, community-focused event aggregator for the Tuscaloosa area. Changes should support one or more of these goals:

1. Keep local event information useful and trustworthy.
2. Keep the project easy to learn from for contributors of varied experience levels.
3. Keep the GitHub Pages deployment simple, stable, and low-maintenance.

## Core Principles
- Prefer clarity over cleverness.
- Prefer simple solutions over heavy abstractions.
- Preserve static-site compatibility (no backend/runtime assumptions).
- Keep dependencies minimal unless there is a clear benefit.
- Make incremental, well-scoped changes.

## Working Guidelines for Agents
- Read `README.md` and `CONTRIBUTING.md` before making substantial changes.
- When editing event pipeline scripts (`scripts/*.mjs`), prioritize data quality:
  - normalize consistently,
  - avoid duplicates when possible,
  - preserve source attribution links,
  - fail gracefully when sources are unavailable.
- When changing UI (`index.html`, `assets/*`):
  - maintain mobile readability,
  - keep accessibility in mind (semantic markup, contrast, keyboard use),
  - avoid unnecessary visual complexity.
- When modifying `data/events.json`, ensure output remains valid JSON and consistent with existing schema.

## Validation Checklist
Before finishing, run the relevant checks (or explain why they could not be run):

- `npm run validate`
- `npm run fetch` (when pipeline/source logic changes)
- `npm run preview` (for UI/content sanity checks)

If UI behavior changed in a noticeable way, capture a screenshot.

## Commits & PRs
- Use clear, human-readable commit messages.
- In PR descriptions, include:
  - what changed,
  - why it helps the project goals,
  - how it was validated,
  - screenshots for notable UI changes.

## Non-Goals
Unless explicitly requested, avoid:
- introducing backend infrastructure,
- large framework migrations,
- broad refactors unrelated to the task,
- changes that make the repo harder for beginners to understand.
