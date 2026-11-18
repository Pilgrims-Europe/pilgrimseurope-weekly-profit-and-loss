## Writing to Git

Before you write text to Git or GitHub (issue, comment, wayfinder map, commit message, PR body), apply the `/wait-what` rules:

1. Start with one or two sentences of context: what this is and why it exists.
2. Write in ASD-STE100 Simplified Technical English: short sentences (max 20 words), active voice, common words, one idea per sentence.
3. Use the terms in `GLOSSARY.md`. Do not use synonyms.
4. Remove text the reader does not need to act or decide.
5. Read it again as a reader who was not in this session. If it is not clear on one read, write it again.
6. Do not add facts to make text clearer. If something is unknown (an owner, a date, a definition), write "Unknown" or ask.

## Reporting

All reports use one house style, from pilgrimseurope.com. This includes HTML reports, questionnaires, dashboards and Streamlit apps. Before you make or change a report, read `.cortex/skills/pilgrims-reporting/SKILL.md`. Start from a template in that folder.

- HTML report: `templates/report.html`
- Questionnaire (also for `/to-questionnaire`): `templates/questionnaire.html`. Output HTML, not `.md`.
- Streamlit: `templates/streamlit/pe_theme.py` and `templates/streamlit/config.toml`

Apply the `/wait-what` rules above to all report text.

## Worktree per session

More than one agent session works on this repo at the same time. Start each session in its own worktree from `origin/main`: `git fetch origin`, then `git worktree add ../wpl-<topic> -b <branch> origin/main`. Leave the main checkout (`pilgrimseurope-weekly-profit-and-loss`) to Chris. Before you build, run SQL or deploy, run `git status` and `git worktree list`.

## Build, check and deploy

- Test SQL in a copy schema: `scripts/build-dev-schema.ps1 [-Schema <name>]`. It runs the tie-out checks at the end. For a local app on the copy, set `WPL_SCHEMA=DEV_ANALYTICS.<name>`.
- Tie-out checks: `scripts/check-tie-out.ps1 [-Schema <name>]` (`sql/checks/tie_out.sql`). A check passes when it returns no rows.
- App checks: in `app/`, `npm run typecheck` and `npm test`. CI runs both on pull requests (`.github/workflows/app-check.yml`).
- Smoke test a running app: `scripts/smoke.ps1 -Base http://localhost:<port>`.
- Deploy to live, after the merge: `scripts/deploy-live.ps1` from a clean `main`.

## Data flow diagram

The README diagram shows the flow of data to the Weekly P&L app. Its source is `docs/data-flow/flow.yml`.

- If a change adds, removes or moves a source, a Snowflake object or a consumer of the app, change `flow.yml` in the same pull request.
- Add one line to the table in `docs/data-flow/CHANGELOG.md`, with status `pending`.
- Run `python scripts/render_flow.py --check`. Fix all errors. To look at the result, use `--preview`. Do not run the script without a flag: that marks the pending lines as rendered.
- Do not edit `flow.svg` or `index.html`, and do not commit a render. A GitHub Action renders the diagram once a day and opens a pull request.
- `flow.yml` shows what is in Snowflake now. Add new objects as `status: planned`. If the same session runs `scripts/deploy-live.ps1` right after the merge, mark them `live` in that pull request.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on Pilgrims-Europe/pilgrimseurope-weekly-profit-and-loss (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
