# Critical Path Scanner

An analysis tool modeled on the Project Budget Tool's structure: sign in, land on a portfolio table, add a project plan through a single modal (pick a PDF or type tasks by hand, review what got detected, import), then open a full analysis view with stat cards, a rule based recommendations panel, a schedule corridor chart, and a critical path breakdown. Save a copy back into the portfolio, or add another PDF into the same project later.

No pre-filled results anywhere. A new account opens on an empty portfolio, a new project starts with zero tasks until a PDF is scanned or a task is added by hand.

Built with React, TypeScript, Vite, Tailwind CSS, and pdfjs-dist for in-browser PDF text extraction. No backend, everything lives in the browser's local storage.

## Flow

1. **Sign in** with a name and password, first sign in creates a local account automatically (see the security note below).
2. **Portfolio**: a table of every saved project (name, status, duration, critical tasks, total tasks, a small trend sparkline), with an "Add project plan" row at the bottom. Empty state matches an unpopulated account.
3. **Add project plan** (modal): if the portfolio already has projects, first pick whether this PDF belongs to an existing project or a new one. Then choose a PDF or switch to manual entry. A short "Analyzing PDF..." state runs inline in the modal, followed by an editable review table (checkbox, task name, duration, detected dependencies) before anything is imported.
4. **Result view**: stat cards (duration, critical tasks, total float, biggest bottleneck), an info banner, a "Recommendations with forecast" panel, a **Target Date Simulator** (project crashing, see below), a schedule corridor chart, a **Confidence Forecast** with Monte Carlo simulation and a per-task criticality index, and a critical path breakdown with inline bars. Supplementary detail below: the network diagram, a single-task what-if duration slider, and the full task table.
5. Add another PDF into the same project, edit tasks by hand, or save changes back to the portfolio at any point.
6. **Export as CSV** for the full task breakdown (name, duration, dependencies, ES/EF/LS/LF, float, critical flag).
7. The portfolio table is searchable (once there are more than a few projects) and every column header is clickable to sort.

## Recent fixes

- **Task id collisions on repeated PDF scans.** Every scanned row used to get an id like `scan-0`, `scan-1`, ... regardless of how many times a PDF was scanned. Scanning a second PDF into a project that already had tasks from an earlier scan produced duplicate ids across the task list, which silently corrupted the CPM calculation (id-keyed maps overwrite on collision), the network diagram, and the task table. Final task ids are now generated fresh with `crypto.randomUUID()` at import time, dependency resolution still happens by name within the scanned batch, then gets remapped onto the new unique ids. The same fix applies to manually added tasks.
- **Status badge used to say "Analyzed" unconditionally**, which carried no real information (of course a project that computed is "analyzed"). It now shows a genuine severity classification (Healthy / Watch / Critical) computed from the same critical-path and float numbers used everywhere else, both in the portfolio table and on a project's own page.
- **Manual task entry couldn't express dependencies at all.** Every manually added task always got an empty dependency list, so manual entry could never produce a real critical path, only a set of unrelated tasks. It now offers a "depends on" picker against tasks already added in the same session, plus a way to remove a task before committing.
- **Editing a task could silently create a dependency cycle.** The dependency picker in the edit form let you pick any other task, including one that already, directly or transitively, depended on the task you were editing. That produces a cycle, which the app already detects and handles gracefully, but with no indication of which edit caused it. Options that would create a cycle are now computed and disabled in the picker itself, labeled with why.
- **Monte Carlo forecasts and crash plans went stale silently.** Running the Confidence Forecast or the Target Date Simulator, then changing the task list afterward (adding a task, applying a crash plan, editing a duration) used to leave the old computed result on screen, looking current when it no longer matched the task list above it. Both now clear whenever the task list actually changes, prompting a fresh run instead of displaying numbers that quietly stopped being true.
- **Delete confirmations used the browser's native `confirm()` dialog**, which breaks the visual design entirely (wrong font, wrong colors, no RTL awareness for Arabic, no day/night theme) and looks like the browser interrupted the app. Replaced with an in-app confirmation dialog (`ConfirmDialog.tsx`) styled consistently with every other modal, plus a proper trash icon with a red hover state on the delete buttons themselves instead of plain text.


## About the "Recommendations with forecast" panel

This is a rule based generator (`src/utils/recommend.ts`) that reads the already-computed CPM numbers (critical tasks, float, the biggest bottleneck) and writes templated prose and a numbered tip list around them. It is not a live call to a language model, there is no API key or network request involved. The math behind every number in it is real, the sentences around it are templated. This is stated here and inside the code so it is never mistaken for a live AI call that isn't happening.

## About the "Schedule corridor" chart

Rather than inventing a spend-over-time series (which a CPM plan simply doesn't have, there is no "actual spend" without a live time tracking integration), the chart plots something that is honestly computable from the schedule itself: the earliest possible cumulative completion curve (every task starts at its earliest start) against the latest allowable cumulative completion curve (every task starts at its latest start, the moment before something on the critical path slips). The gap between the two lines at any point is the schedule's slack at that moment, and they touch exactly where the critical path is running. Running the recommendations panel adds a third, optimized curve based on shortening the current bottleneck task.

## Confidence Forecast (Monte Carlo simulation)

A real Monte Carlo simulation, not a canned number. Every task gets a PERT-style three-point estimate derived from its single entered duration (optimistic 80%, most likely the entered value, pessimistic 130%, standard rules of thumb absent better data). Across 2000 random trials, a duration is drawn from a triangular distribution for every task and the complete critical path calculation is re-run for that trial. The result is P50 / P80 / P95 confidence levels for the actual finish date, shown as a histogram, plus a **criticality index** per task: the percentage of trials in which that task ended up on the critical path. A task can be "not critical" in the single most-likely estimate shown everywhere else in the app and still be the biggest schedule risk once uncertainty is taken into account, this is where that shows up.

## Target Date Simulator (project crashing)

The direct answer to "what would it take to hit an earlier deadline." Enter a target project duration, and the tool runs the classic project management "crashing" technique: greedily shorten whichever task on the current critical path has the most room left, recompute the entire critical path (crashing one task can shift which path is critical), and repeat until the target is met or nothing more can reasonably be shortened. It returns an exact list of which tasks to shorten and by how many days, not just "the project needs to be faster." Tasks are never crashed below 60% of their original duration, a stand-in ceiling for realistic compressibility in the absence of real cost or resourcing data. This is a heuristic, not a mathematically optimal solution (that would be a linear program), documented as such in the UI.

## Account and storage, read this before using real data

- **Login is a local demo, not real security.** Name and password are stored in plain text in the browser's own storage, there is no server. Do not reuse a real password, the login screen says so directly.
- **Portfolio data lives in the browser.** Clearing site data or switching browsers/devices means starting over with an empty portfolio, there is no sync.
- Everything is namespaced under `cps-` prefixed `localStorage` keys.

## PDF scan

The PDF is read entirely in the browser (`pdfjs-dist`), it never leaves the device. A heuristic parser (`src/utils/pdfParser.ts`) looks for lines shaped like a task name, a duration, and optionally a list of dependencies. Recognized rows are always shown as an editable draft before anything is added, since PDF text extraction is inherently a little lossy.

Format that parses reliably, one task per line:

```
Requirements Workshop; 3;
System Architecture; 5; Requirements Workshop
Backend Development; 10; System Architecture
```

## Methodology (critical path)

- **ES / EF** (earliest start, earliest finish): forward pass through the dependency graph
- **LS / LF** (latest start, latest finish): backward pass from the project end date
- **Float**: LS minus ES. Zero float means the task sits on the critical path, positive float means there is slack

## Local development

```bash
npm install
npm run dev
```

## Deploying to Vercel

1. Push this folder to a new GitHub repository, for example `github.com/nadin735/critical-path-scanner`
2. Go to vercel.com, choose "Add New Project," and import that repository
3. Vercel auto detects the Vite framework preset, no extra configuration needed
4. Deploy

## Project structure

```
src/
  components/
    LoginScreen.tsx           name + password, demo account creation
    PortfolioDashboard.tsx    table of saved projects, aggregate stats
    AddProjectModal.tsx       target project picker, PDF/manual entry, review table
    ProjectResultScreen.tsx   stat cards, recommendations, corridor chart, breakdown
    ScheduleCorridorChart.tsx earliest/latest/optimized completion curves
    ConfidenceForecast.tsx    Monte Carlo simulation, P50/P80/P95, criticality index
    TargetDateSimulator.tsx   project crashing: hit a target date, see what to shorten
    NetworkDiagram.tsx        dependency graph, gold path is critical
    TaskTable.tsx             sortable list with ES/EF/float/status
    TaskForm.tsx              add and edit modal with dependency picker, cycle-safe
    ConfirmDialog.tsx         on-brand delete confirmation, replaces native confirm()
    WhatIfPanel.tsx           single-task duration slider
  utils/
    cpm.ts                    topological sort, forward/backward pass, float
    pdfParser.ts               PDF text extraction and heuristic line parser
    recommend.ts               rule based analysis text generator
    corridor.ts                schedule corridor curve data
    monteCarlo.ts               Monte Carlo simulation + criticality index
    crashSchedule.ts            greedy project crashing algorithm
    account.ts                 local demo account system
    portfolio.ts                per-account project storage
  i18n.ts                       German, English, Arabic text
  types.ts                      shared TypeScript types (Task, Project)
  App.tsx                       account state, theme, RTL, screen routing
```
