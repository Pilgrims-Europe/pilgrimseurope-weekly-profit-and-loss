This is a handoff for the weekly P&L repo. It covers the session of 2026-11-19: three open pull requests, the open ticket #86, and the deploy steps that follow the merges. Chris reviews and merges all pull requests.

## State

| Item | State |
| --- | --- |
| PR #83 `Fix: out-of-date RULE and REASON texts in the line catalogue` (closes #68) | Open, checks pass. Text only. Independent. |
| PR #88 `Change: count only cross-plant STO issues` (closes #86) | Open, checks pass. Moves 17 lines. Merge first. |
| PR #85 `Add: production tonnage check on the Quality page` (closes #55) | Open, checks pass. One squashed commit plus 2 more. Its numbers assume #88 is in. |

Worktrees (all under `c:\Users\cmccann2\.Git\`): `wpl-rule-texts` (#83), `wpl-sto-cross-plant` (#88), `wpl-prod-tonnage-dq` (#85), `wpl-handoff-1119` (this file). Delete each worktree and branch after its merge.

## What was learned

Details are in #86 (and its comment), #55 and the PR bodies. Short version:

- Internal Sales Tonnage (STO) counted moves inside the plant (641 H and S of the same size, `ISCROSSPLANTTRANSFER` blank) and reversals of goods received (642 H). New rule (#88): 641 H and 642 S rows with `ISCROSSPLANTTRANSFER = 'X'`.
- COPA intercompany sales (invoiced to Food Masters) and STO deliveries do not overlap. The 32 STO deliveries of Redruth, week 2026-11-02, match no COPA document. The GLOSSARY still says the link is Unknown.
- Plants 2517 = Westerleigh and 2525 = Spalding. Both send goods to Redruth and Bromborough.
- The production tonnage check ties to within 3.1% (Bromborough) and 2.8% (Redruth), with #88 applied. The Redruth gap was a semi-finished stage loop (Z61 on a GL other than 5000100, and consumption 201/202) in the stock term, plus the missing COPA intercompany column. Both are fixed in #85.

## Next steps

1. Wait until Chris merges #88, then #85. #83 can go at any time.
2. From a clean `main` (run `git pull` first): `scripts/deploy-live.ps1`. Run it after #88 and #83 are merged, and again after #85.
3. In a new small `Docs:` PR, mark `WPL_DQ_PRODUCTION_TONNAGE` and `WPL_T_DQ_PRODUCTION_TONNAGE` as `live` in `docs/data-flow/flow.yml`. Do not run `scripts/render_flow.py` without a flag.
4. Remove the worktrees and branches.
5. Optional: set the GLOSSARY entry for STO, now that the link to intercompany sales is known (no overlap, one week at one site). Chris decides.

## Open points (not started)

- #86 stays open until #88 merges. The 642 reversals check is done.
- Open question for Chris on #55: the finished goods stock movement source is a proposal, not decided.
- Tolerance for the production tonnage difference is Unknown, so there is no RAG.
- #20 still open (STO link to intercompany rule).

## Traps

- Terminal: long multi-line PowerShell commands can hang in a here-string prompt. Write files with the write tool, then run them. Chained commands are sometimes split by the tool, so run steps one at a time and check `git status`.
- A squash with `git reset --soft origin/main` on a branch that is behind `main` reverts the newer `main` files. Reset to the old merge-base, commit, then `git rebase origin/main`.
- Test SQL in a copy schema. To test #85 with #88, apply `sql/09` of #88 to the copy schema (replace the schema name), then call `WPL_REFRESH`. Drop the copy schema afterwards.
- `git status` and `git worktree list` first. Other sessions share the main checkout.

## Suggested skills

- `/code-review` on #88 if Chris wants a review of that PR (not run on #88 or #83).
- `/diagnosing-bugs` if a number does not tie after deploy.
- `/retro` to look back at this session.
