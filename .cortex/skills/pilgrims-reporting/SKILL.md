---
name: pilgrims-reporting
description: House style for ALL Pilgrim's Europe reporting output in this repo — HTML reports, questionnaires, dashboards and Streamlit apps. Use whenever you create or edit a report, .html file, questionnaire, dashboard or Streamlit app, or when the user asks for a report, write-up, summary page, KPI page, form, or "make it look like Pilgrim's". Styling follows pilgrimseurope.com. Triggers: report, HTML report, questionnaire, to-questionnaire, dashboard, Streamlit, st., KPI page, summary page, weekly P&L report, export to .md, email/Teams handout.
---

# Pilgrim's Europe reporting

This skill sets one look and one writing style for all reports in this repo. It uses the brand from pilgrimseurope.com. Start from a template in `templates/`. Do not design a report from nothing.

## Pick a template

| Output | Start from | Notes |
| --- | --- | --- |
| HTML report, summary, KPI page | `templates/report.html` | Delete components you do not need. |
| Questionnaire (also `/to-questionnaire`) | `templates/questionnaire.html` | Replace this skill's default `.md` output with this HTML. |
| Streamlit app or dashboard | `templates/streamlit/pe_theme.py` + `templates/streamlit/config.toml` | Call `apply_theme()` first in the app. |

Example of a finished questionnaire: `questionnaires/kill-rules.html`.

## Workflow

1. Copy the template to the new file. Save new HTML reports under `reports/` and questionnaires under `questionnaires/`, unless the user names a different place.
2. If the file is `.html`, also load the `html-authoring` skill and follow its rules. The templates already pass them: marker meta tag, metadata block, no CDN, `light-dark()` colours, tables in `.table-wrap`.
3. Replace every `{{PLACEHOLDER}}`. Remove example content. A finished file must have no `{{`.
4. Write all text with the `/wait-what` rules (see "Writing" below).
5. Put real data in the file. Record every query in the metadata block as `{ "type": "query", "sql": "..." }`. Never invent numbers.
6. Check before you report done: search the file for `{{`, run `node --check` on the inline script, and parse the metadata JSON.

## Brand tokens

Source: `https://pilgrimseurope.com/build/css/style.css` (checked 2026-11-13). Use these values only.

| Token | Hex | Use |
| --- | --- | --- |
| `--brand` | `#00406E` | Headings, table headers, links, focus rings, card accent bar |
| `--brand-light` | `#025895` | Hover on brand items, secondary series in charts |
| `--brand-navy` | `#1A2B37` | Page header (hero) background, Streamlit sidebar |
| `--red` | `#E11F20` | Primary buttons, hero bottom border, question numbers, "bad" values |
| `--red-dark` | `#CB1011` | Primary button hover |
| `--yellow` | `#FF9D00` | Eyebrow text, warning callouts |
| `--green` | `#5B6C43` | "Good" values, success callouts |
| `--text` | `#374151` | Body text |
| `--muted` | `#6B7280` | Secondary text, captions |
| `--line` | `#E5E7EB` | Borders and dividers |
| `--page` | `#F9FAFB` | Page background |
| `--card` | `#FFFFFF` | Card background |

Dark mode: the templates set a dark value for each token with `light-dark()`. Keep them.

Fonts (same as the website):

- Headings h2–h4, buttons, labels: `'Fjalla One', 'Arial Narrow', 'Segoe UI', sans-serif`, weight 400.
- h1 only: `moret, Georgia, 'Times New Roman', serif`, weight 400.
- Body: `Montserrat, 'Segoe UI', -apple-system, system-ui, sans-serif`.
- Do not link Google Fonts or Typekit. The Snowflake sandbox blocks them. The fonts show only where they are installed. Otherwise the fallback shows.

Shapes: cards `border-radius: 1.25rem`. Inputs and tables `0.5rem`. Buttons `9999px` (pill).

## Layout rules

- Order: header, then KPI tiles, then charts, then detail tables. Each screen answers: what is happening, why, what needs attention.
- HTML width: `max-width: 880px` for reports. Streamlit: `max-width: 1400px`.
- One idea per card. Use the left accent bar (`.card.accent`) for the most important card or question.
- Numbers: `en-GB` format, right-aligned, `tabular-nums`. Show units in the column header.
- Colour shows meaning, not decoration: green good, red bad, yellow warning, brand blue neutral.

## Components (in `templates/report.html`)

`.hero` header with eyebrow, h1 and meta grid · `.kpi-row` / `.kpi` tiles with `.delta.up|down` · `.card` and `.card.accent` · `.callout.info|warn|good|bad` · `.table-wrap` table · `.bars` CSS bar chart · optional chart.js block · `.badge` · optional `.bar` export footer.

### Charts

- Use the CSS bar chart (`.bars`) when the file goes by email or Teams. It works in any browser.
- chart.js from `/libs/chart.js@4.4.4/chart.umd.js` renders only when the report is published to Snowflake. The template shows a short note when chart.js is not available.
- Chart colours: `#00406E`, `#E11F20`, `#FF9D00`, `#5B6C43`, `#025895`, `#6B7280`, in that order.

### Export bar (optional)

Keep the export bar when someone will send the report or its answers by email or Teams. Delete it for read-only reports. The buttons are "Download as .md" (a Blob download) and "Copy" (`navigator.clipboard.writeText`). The `buildMarkdown()` function must output the same content as the page, in Markdown.

## Questionnaires

Use this for every `/to-questionnaire` run.

- Output one `.html` file, `questionnaires/<slug>.html`. Do not write the `.md` file that the base skill describes.
- Keep the base skill's structure: Purpose, From, To, How your answers will be used, Context, How to answer, themed sections, "Anything else?".
- Each question has one idea, a "Why this matters" line if needed, a "Comments" field, and an "If you don't know, who does?" field when the recipient can pass it on.
- If the answer is a choice from known values, use radio buttons or a tick-box table. Pull the values from Snowflake. Do not ask for free text.
- The export has the recipient's name, a "Download answers (.md)" button, a "Copy answers" button, and autosave. Autosave uses `localStorage` inside `try/catch`, because the Snowflake sandbox blocks storage.
- Deadline: write "Unknown" if the user does not give one.

## Streamlit

1. Copy `templates/streamlit/config.toml` to `.streamlit/config.toml` in the app folder.
2. Copy `templates/streamlit/pe_theme.py` next to the app.
3. Call `apply_theme()` immediately after `st.set_page_config(...)`.
4. Use `hero()`, `kpi_row()` and `callout()` from `pe_theme.py` for the header, KPI tiles and callouts.
5. Use the chart colour order above for every chart.

## Writing

Apply the `/wait-what` rules to all report text, as `AGENTS.md` requires for Git text:

1. Start with one or two sentences of context: what this is and why it exists.
2. Write in ASD-STE100 Simplified Technical English. Use sentences of 20 words or fewer, active voice, and one idea per sentence.
3. Use the terms in `GLOSSARY.md`, not synonyms.
4. Remove text the reader does not need to act or decide.
5. Do not add facts. Write "Unknown" when a value, owner or date is not known.
