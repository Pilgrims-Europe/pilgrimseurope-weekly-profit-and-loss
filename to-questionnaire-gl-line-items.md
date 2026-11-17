# GL line items for the weekly P&L

> **Replaced.** Do not send this questionnaire. Its 3 questions are now in [`questionnaires/line-sources-for-gui.html`](https://github.com/Pilgrims-Europe/pilgrimseurope-weekly-profit-and-loss/blob/main/questionnaires/line-sources-for-gui.html) (questions 3 to 5, 9 and 10). This file is kept as a record of Peter's work on ticket #4.

**Purpose:** Issue #4 checked which GL line item data is in Snowflake, compared with the SAP report FAGLL03H. Three decisions need your answer before we build.

**From:** Peter Nwora, **To:** Gui, **How your answers will be used:** They go into issue #4 and into the spec for the weekly P&L.

## Context

Site finance uses FAGLL03H for PPV, stock variances and consumables. Snowflake gets GL line items from BW, in one table. For the pilot sites (Redruth and Bromborough) it has account, cost centre, document, posting date, material, plant and PO. It has no line item number, posting key, assignment or reference. Supplier is on goods receipt lines but not on invoice lines. We chose to use ledger 1L only, and to leave out opening balances (period 000).

## How to answer

Reply in a few days. No fixed deadline. Short answers are fine. "I don't know" is a useful answer: tell us who does.

## GL accounts

### Which GL accounts are PPV, stock variances and consumables for Redruth and Bromborough?

_Why this matters: Snowflake cannot tell us which accounts site finance means. We need the list to build the lines._

>

## Matching to FAGLL03H

### Can site finance work without the line item number, posting key, assignment and reference?

We recommend yes for v1: lines would show by account, cost centre, document and material, so site finance cannot match every FAGLL03H line one to one. BW could add the fields later.

_Why this matters: if the answer is no, we must wait for BW to add these fields._

>

## PPV by supplier

### Does the weekly P&L need PPV by supplier?

We recommend no for v1: show PPV by material and PO. Invoice lines have no supplier, so a supplier view needs extra work.

>

## Anything else?

Is there anything we did not ask that we should know?

>
