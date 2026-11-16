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

## Agent skills

### Issue tracker

Issues live in GitHub Issues on Pilgrims-Europe/pilgrimseurope-weekly-profit-and-loss (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
