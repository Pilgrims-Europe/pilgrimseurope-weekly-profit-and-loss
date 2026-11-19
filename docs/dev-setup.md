# Developer setup

This page shows how to set up your computer and Cortex Code Desktop to work on the Weekly P&L repo. Do it once. It takes about 30 minutes.

## 1. Install the tools

| Tool | Version | Used for |
| --- | --- | --- |
| Cortex Code Desktop | Latest | Editor and agent. |
| Git | Latest | Version control. |
| GitHub CLI (`gh`) | Latest | Pull requests. Run `gh auth login`. |
| Snowflake CLI (`snow`) | Latest | The check and deploy scripts. |
| Node.js | 22 or later | The app in `app/`. |
| Python | 3.13 | `scripts/render_flow.py`. |

## 2. Connect to Snowflake

1. Sign in to Snowflake in Cortex Code Desktop with your own user.
2. Add a connection in `~\.snowflake\connections.toml`. Make it the **default** connection. The scripts in `scripts/` and the local app use the default connection.
3. Check that you can read the schema:

```powershell
snow sql -q "SELECT COUNT(*) FROM DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SITE"
```

If this fails, ask for a role that can read `DEV_ANALYTICS.FINANCE_PL_WEEKLY`. Unknown: which role gives that access.

## 3. Open the repo

1. Clone the repo. Open the folder in Cortex Code Desktop.
2. Install the extensions in the prompt. The list is in `.vscode/extensions.json`.
3. Install the app packages:

```powershell
cd app
npm ci
```

## 4. Check that it works

| What | Command | Pass when |
| --- | --- | --- |
| Types | `npm run typecheck` (in `app/`) | No errors. |
| Tests and coverage | `npm run test:coverage` (in `app/`) | All tests pass. Coverage is above the thresholds in `app/vitest.config.ts`. |
| Tie-out checks | `scripts/check-tie-out.ps1` | It prints `tie_out OK`. |
| App contract check | `scripts/check-tie-out.ps1 -Check app_contract` | It prints `app_contract OK`. |
| Data flow diagram | `python scripts/render_flow.py --check` | It prints `OK`. |

CI runs the first two on each pull request. The other three need Snowflake or Python, so run them yourself when you change SQL or the data flow.

## 5. Run and debug

Open **Run and Debug**. The repo gives these configurations:

- **Next.js: debug server**. It starts `npm run dev`. Set breakpoints in `app/lib/wpl.ts` and `app/app/api/**/route.ts`.
- **Next.js: debug server on a test schema copy**. It sets `WPL_SCHEMA`, so the app reads your copy of the schema. Build the copy first with `scripts/build-dev-schema.ps1`.
- **Vitest: current test file**. It runs the open test with the debugger.
- **smoke.ps1**, **check-tie-out.ps1: tie-out checks** and **check-tie-out.ps1: app contract**. Start the dev server before you run the smoke test.

The **Testing** panel shows the Vitest tests. Run or debug one test from there.

## 6. Cortex Code settings

- Set the approval mode to **Approve for me**. Do not turn on `chat.tools.global.autoApprove`. Your role may reach live data, and this setting runs every tool call without a question.
- Use **Plan** mode for a change that touches many files.
- Start each agent session in its own worktree, as `AGENTS.md` says. Leave the main checkout alone.
- This repo needs no MCP servers. Each server adds tool text to every request and slows the agent. Add `qlik` only if your work needs Qlik. It needs your own Qlik Cloud account and OAuth client. Do not copy another person's client file.
- The agent reads `AGENTS.md` and `GLOSSARY.md` in this repo. The report style is in `.cortex/skills/pilgrims-reporting`.

## 7. Your first change

1. `git fetch origin`, then `git worktree add ../wpl-<topic> -b <branch> origin/main`.
2. Make the change. If you change a column that `app/lib/wpl.ts` reads, change `sql/checks/app_contract.sql` in the same pull request.
3. Run the checks in section 4 that apply.
4. Open a pull request. Start the title with one type word and a colon, as `AGENTS.md` says.
