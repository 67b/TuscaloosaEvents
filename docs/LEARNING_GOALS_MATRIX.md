# Learning Goals Matrix

Tuscaloosa Events is both a local event aggregator and a learning project. This matrix connects the learning goals from the README and CONTRIBUTING guide to concrete examples in the repository.

Use it as a map while exploring the codebase. Each row points to a practical place where a concept shows up in real project work.

| Learning Goal | Repository Example | Where To Look |
|---|---|---|
| Git and GitHub workflows | Contributors use issues to describe changes, branches to isolate work, pull requests to review changes, and merges to update the live project. | `CONTRIBUTING.md`, `.github/ISSUE_TEMPLATE/issue_template.md`, GitHub Issues and Pull Requests |
| Branching and version control | The contributing workflow asks contributors to create focused branches, make small changes, and submit pull requests instead of changing everything at once. | `CONTRIBUTING.md` |
| Collaboration via pull requests | Pull requests give contributors a place to explain what changed, why it helps, how it was checked, and any screenshots for UI work. | `CONTRIBUTING.md`, GitHub Pull Requests |
| CI/CD | GitHub Actions runs the event refresh workflow, validates generated event data, and commits updated `data/events.json` when the data changes. | `.github/workflows/refresh-events.yml`, `package.json` |
| GitHub Actions | The refresh workflow checks out the repo, sets up Node, runs `npm run fetch`, runs `npm run validate`, and uses an auto-commit action for refreshed data. | `.github/workflows/refresh-events.yml` |
| APIs and automation | The fetch script collects event pages and weather data, normalizes the results, and writes a static JSON file for the site to use. | `scripts/fetch-events.mjs`, `scripts/lib/normalize.mjs`, `data/events.json` |
| Event aggregation | Events from several Tuscaloosa-area sources are collected into one consistent structure with titles, dates, venues, source links, categories, and descriptions. | `scripts/fetch-events.mjs`, `data/events.json` |
| Data normalization | Raw source data is cleaned, dates are normalized, duplicate-looking events are reduced, and events are sorted before being written to JSON. | `scripts/lib/normalize.mjs`, `scripts/fetch-events.mjs` |
| Data validation | A validation script checks required event fields, duplicate IDs, date ordering, time status rules, weather fields, and sample calendar export output. | `scripts/validate-events.mjs`, `scripts/lib/normalize.mjs` |
| Calendar standards | Event cards can generate `.ics` calendar files using standard calendar fields such as `BEGIN:VCALENDAR`, `SUMMARY`, `DTSTART`, and `DTEND`. | `scripts/lib/calendar.mjs`, `assets/app.js` |
| Static website hosting | The site runs from committed files on GitHub Pages and uses `data/events.json` instead of a backend database or server. | `README.md`, `index.html`, `assets/app.js`, `data/events.json` |
| Markdown | Project documentation, contribution guidance, this matrix, and the issue template are written in Markdown so they are readable on GitHub. | `README.md`, `CONTRIBUTING.md`, `docs/LEARNING_GOALS_MATRIX.md`, `.github/ISSUE_TEMPLATE/issue_template.md` |
| Modern web tooling | The project uses npm scripts and Node modules for repeatable tasks such as fetching data, validating data, and running a local preview server. | `package.json`, `scripts/preview.mjs`, `scripts/validate-events.mjs` |
| AI-assisted development | The project welcomes AI tools while reminding contributors to review generated work, understand changes, and keep maintainability in mind. | `README.md`, `CONTRIBUTING.md`, `AGENTS.md` |
| Automated testing and checks | The current check is lightweight validation rather than a large test framework, which keeps the project approachable while still catching broken event data. | `npm run validate`, `scripts/validate-events.mjs` |
| Accessibility and mobile usability | UI changes are expected to preserve mobile readability, semantic markup, contrast, and keyboard-friendly behavior. | `AGENTS.md`, `index.html`, `assets/styles.css` |

## Example Learning Paths

If you are new to GitHub, start with `CONTRIBUTING.md`, open an issue, create a branch, and practice describing a small pull request.

If you want to learn automation, read `.github/workflows/refresh-events.yml`, then trace how it calls `npm run fetch` and `npm run validate`.

If you want to learn data quality, start in `scripts/fetch-events.mjs`, then follow the event objects through `scripts/lib/normalize.mjs` and `scripts/validate-events.mjs`.

If you want to learn static web development, open `index.html`, `assets/app.js`, and `assets/styles.css`, then compare them with the generated `data/events.json` file they display.

If you want to learn AI-assisted development, compare an issue request with the resulting code or documentation change, then review the work as if you were preparing it for a teammate.
