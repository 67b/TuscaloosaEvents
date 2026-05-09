# Tuscaloosa Events

Welcome

This repository is a hands-on learning project designed for friends, family, and anyone curious about modern software development workflows.

The goal of this project is not just to build something useful, but to experiment with and better understand the tools and processes that power real-world development teams.

Topics explored in this repository include:

* Git and GitHub workflows
* Branching and version control
* Collaboration through pull requests and shared development
* CI/CD (Continuous Integration / Continuous Deployment)
* AI-assisted development using OpenAI Codex
* APIs and automation
* Experimentation with modern web and development tooling

This project is intentionally open, collaborative, and educational. Think of it as a sandbox for learning, testing ideas, making mistakes, improving workflows, and exploring how humans and AI can build software together.

Whether you are here to contribute code, learn Git basics, experiment with AI-assisted programming, or simply follow along, welcome aboard.

## What It Is

A mobile-first static event aggregator for Tuscaloosa, Alabama. The site is designed for GitHub Pages and uses committed JSON data so the public page does not need a backend.

## What It Does

- Displays upcoming events from the University of Alabama, Visit Tuscaloosa, Tuscaloosa Patch, and Tuscaloosa Public Library.
- Groups events by date and supports search, source filtering, and date-range filtering.
- Lets visitors add events to their phone calendar by downloading an `.ics` file.
- Keeps source links visible so visitors can confirm details before attending.

## Local Commands

This repo has no runtime dependencies. Node 20+ is enough.

```bash
node scripts/fetch-events.mjs
node scripts/validate-events.mjs
node scripts/preview.mjs
```

If `npm` is available, the same commands are exposed as:

```bash
npm run fetch
npm run validate
npm run preview
```

## Data Refresh

`scripts/fetch-events.mjs` fetches the source calendars, normalizes the results, deduplicates likely matches, sorts by start date, and writes `data/events.json` plus the matching `data/events.js` fallback.

The included `.github/workflows/refresh-events.yml` runs weekly on Monday morning and can also be started manually from the GitHub Actions tab. It commits `data/events.json` and the matching `data/events.js` fallback when events change.

## GitHub Pages

The included `.github/workflows/pages.yml` deploys the repository root to GitHub Pages on pushes to `main`. In the GitHub repo settings, configure Pages to use GitHub Actions.

## Calendar Downloads

The browser creates an `.ics` file when someone taps “Add to Calendar.” iOS typically opens the calendar import flow; Android behavior depends on the installed calendar and browser. Browsers do not allow a web page to silently insert events into a personal calendar.

## Source Notes

Event websites can change markup. The scraper is intentionally dependency-free and tolerant of partial source failures. If one source changes, the script will still write events from the other sources and record warnings in `data/events.json`.
