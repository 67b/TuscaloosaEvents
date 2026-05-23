# Tuscaloosa Events

Tuscaloosa Events is a community event aggregator and a hands‑on learning project for exploring Git/GitHub workflows, automation and AI‑assisted development.

The goal of this project is not just to build something useful, but to experiment with and better understand the tools and processes that power real-world development teams.

## Live Site
The site is deployed via GitHub Pages. You can browse it here:
https://67b.github.io/TuscaloosaEvents/

<img width="200" height="200" alt="image" src="https://github.com/user-attachments/assets/ec0f186d-5c7c-4971-84a7-17206483c0fc" />

## What It Is

Tuscaloosa Events is an event aggregator for the Tuscaloosa area.  The site runs entirely on GitHub Pages￼ and uses committed JSON data, so the public page does not need a backend. The goal is to provide a useful list of local events while also serving as a sandbox for practicing Git/GitHub workflows, automation and AI‑assisted development.

## Features

* Upcoming events: Shows upcoming events from multiple sources around Tuscaloosa.
* Date grouping & search: Events are grouped by date and searchable by keyword.
* Calendar export: Visitors can add an event to their device’s calendar by downloading an .ics file.
* Source links: Each event retains a link back to the original source so you can confirm details before attending.

## Screenshots
<img width="296" height="612" alt="Screenshot of main page" src="https://github.com/user-attachments/assets/8042de91-24e1-4f2e-9c8b-bc6bd5743dd9" />

<img width="296" height="612" alt="Screenshot of an event on the page" src="https://github.com/user-attachments/assets/8c981ade-5f0f-45ae-89a8-1b03108a5c04" />

<img width="296" height="612" alt="GIF that shows the action of scrolling the page and adding an event to your device's calendar." src="https://github.com/user-attachments/assets/7b9e9693-d544-49c0-a78d-9849fd946611" />

## Architecture & Data Pipeline

* Data fetch: A script (scripts/fetch-events.mjs) fetches event data from various calendars, normalizes the results, deduplicates likely matches, sorts them by start date and writes the output to data/events.json.
* Automation: A GitHub Actions workflow runs daily (.github/workflows/refresh-events.yml). It commits data/events.json whenever events change and triggers a deployment to GitHub Pages.
* Deployment: Every commit to the main branch deploys the repository root to GitHub Pages, ensuring the site stays up‑to‑date.

For a visual walkthrough, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Learning Goals

This repository isn’t just about building a list of events. It’s designed as a practical learning environment where you can experiment with and better understand tools and processes that power real‑world development.

Topics explored include:

* Git and GitHub workflows
* Branching and version control
* Collaboration via pull requests
* CI/CD (Continuous Integration / Continuous Deployment)
* AI‑assisted development using tools like ChatGPT and GitHub Copilot 
* APIs and automation
* Markdown & modern web tooling

For a practical map of these topics to real files and workflows in this repository, see [the Learning Goals Matrix](docs/LEARNING_GOALS_MATRIX.md).

## Project Philosophy

This project is intentionally open, collaborative and educational. Think of it as a sandbox for learning, testing ideas, making mistakes, improving workflows and exploring how humans and AI can build software together. You’re encouraged to fork the repo, try new ideas and contribute improvements.

## Contributing

Contributions of all sizes are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) to understand our expectations for an inclusive, respectful environment.

## License

This project is licensed under the terms of the MIT License. Feel free to reuse and remix with attribution.

## Testing & Data Validation

For a beginner-friendly walkthrough of automated checks, data validation, and step-by-step local testing, see [Testing and Validation Guide](docs/TESTING_AND_VALIDATION.md).
## Related Concepts

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [LEARNING_GOALS_MATRIX.md](docs/LEARNING_GOALS_MATRIX.md)
- [TESTING_AND_VALIDATION.md](docs/TESTING_AND_VALIDATION.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
