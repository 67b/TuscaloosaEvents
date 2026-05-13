# Tuscaloosa Events

Welcome!

This repository is a hands-on learning project designed for myself, friends, family, and anyone curious about modern software development workflows.

The goal of this project is not just to build something useful, but to experiment with and better understand the tools and processes that power real-world development teams.

Topics explored in this repository include:

* Git and GitHub workflows
* Branching and version control
* Collaboration through pull requests and shared development
* CI/CD (Continuous Integration / Continuous Deployment)
* AI-assisted development using OpenAI Codex, Claude Code, or GitHub Copilot.
* APIs and automation
* Markdown
* Experimentation with modern web and development tooling

This project is intentionally open, collaborative, and educational. Think of it as a sandbox for learning, testing ideas, making mistakes, improving workflows, and exploring how humans and AI can build software together.

## What It Is

An event aggregator for Tuscaloosa, Alabama. The site is designed for GitHub Pages and uses committed JSON data so the public page does not need a backend.

## What It Does

- Displays upcoming events from various places in the Tuscaloosa area.
- Groups events by date and supports search.
- Lets visitors add events to their device's calendar by downloading an `.ics` file.
- Keeps source links visible so visitors can confirm details before attending.

## Screenshots
<img width="296" height="612" alt="Screenshot of main page" src="https://github.com/user-attachments/assets/8042de91-24e1-4f2e-9c8b-bc6bd5743dd9" />

<img width="296" height="612" alt="Screenshot of an event on the page" src="https://github.com/user-attachments/assets/8c981ade-5f0f-45ae-89a8-1b03108a5c04" />

<img width="296" height="612" alt="GIF that shows the action of scrolling the page and adding an event to your device's calendar." src="https://github.com/user-attachments/assets/7b9e9693-d544-49c0-a78d-9849fd946611" />


## Data Refresh

`scripts/fetch-events.mjs` fetches the source calendars, normalizes the results, deduplicates likely matches, sorts by start date, and writes `data/events.json`.

The included `.github/workflows/refresh-events.yml` runs daily. It commits `data/events.json` when events change.

## GitHub Pages

A commit to `main` deploys the repository root to GitHub Pages.

Link to live page: https://67b.github.io/TuscaloosaEvents/

<img width="200" height="200" alt="image" src="https://github.com/user-attachments/assets/ec0f186d-5c7c-4971-84a7-17206483c0fc" />


## Calendar Downloads

The browser creates an `.ics` file when someone taps “Add to Calendar.” iOS typically opens the calendar import flow; Android behavior depends on the installed calendar and browser. Browsers do not allow a web page to silently insert events into a personal calendar.

## Source Notes

Event websites can change markup. The scraper is intentionally dependency-free and tolerant of partial source failures. If one source changes, the script will still write events from the other sources and record warnings in `data/events.json`.
