# Testing and Validation Guide

This guide explains automated testing and data validation in **Tuscaloosa Events** in a beginner-friendly way.

## What automated testing means in this repo

This project uses **lightweight automated checks** instead of a heavy test framework.
The goal is to keep quality high while staying beginner-friendly.

Primary automated check:

- `npm run validate` runs `scripts/validate-events.mjs`.

That validation script checks things such as:
- JSON structure and required top-level fields,
- required event fields,
- duplicate event IDs,
- date/time consistency and ordering,
- selected weather metadata and calendar export assumptions.

If validation fails, it exits with a non-zero status so CI can catch the problem.

## How automation uses these checks

The refresh workflow (`.github/workflows/refresh-events.yml`) runs:
1. `npm run fetch`
2. `npm run validate`

This means broken data should be caught before automated commits are created.

## Local testing: quick start

1. Install **Node.js 20+**.
2. Install dependencies:
   - `npm install`
3. Fetch/refresh event data:
   - `npm run fetch`
4. Run validation checks:
   - `npm run validate`
5. Preview the site locally:
   - `npm run preview`
6. Open the printed localhost URL in your browser.

## Manual testing checklist (human checks)

After running `npm run preview`, verify:
- The page loads without obvious layout breakage.
- Search works for a known keyword.
- Events appear in sensible date order.
- Source links open correctly.
- "Add to calendar" still downloads a valid `.ics` file.

## Programmatic testing checklist (automated checks)

Run these commands from the repository root:

```bash
npm run fetch
npm run validate
```

Optional (recommended before opening a PR):

```bash
npm run preview
```

This mirrors the project automation and helps you catch errors early.
