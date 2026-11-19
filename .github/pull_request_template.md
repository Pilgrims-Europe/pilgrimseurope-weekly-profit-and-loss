<!--
Title: start with one type word and a colon. Example: "Fix: plan rows in the GL lines".

  Add       A new line, tab, view, report or check.
  Fix       A number or a behaviour was wrong.
  Change    A decided rule moves a number.
  Research  Notes only.
  Docs      Glossary, README, reports or questionnaires.
  Tooling   CI, scripts or upgrades.

Use one type for each pull request. If you find a fix during other work, put it in a new pull request.
A GitHub Action checks the title and adds the label.
-->

## What and why

<!-- One or two sentences: what this pull request changes and why. -->

Closes #

## Numbers that move

<!-- For Fix and Change: each P&L line or kill figure that moves. Give the value before and after, for one site and one week. Write "None" if no number moves. -->

## Checks

<!-- What you ran and the result. For example: copy schema, tie-out checks, npm test. Write what you did not run. -->

## Deploy

- [ ] Nothing to deploy.
- [ ] After the merge, run `scripts/deploy-live.ps1` from a clean `main`.

## Not in this pull request

<!-- Related work that this pull request does not do. Delete this section if there is none. -->

## Data flow

- [ ] This pull request does not change the flow of data to the app.
- [ ] This pull request changes the flow of data. I updated `docs/data-flow/flow.yml` and added a `pending` line to `docs/data-flow/CHANGELOG.md`.
