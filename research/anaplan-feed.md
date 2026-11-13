# How can Snowflake data load into Anaplan?

Ticket: #7. Today, site finance uploads the weekly P&L to Anaplan by hand. This note lists the options to load it from Snowflake, and what each option needs. Research date: 2026-11-12.

## Short answer

Anaplan already reads data from our Snowflake account. A user `ANAPLAN_SECURE` connects every day with key-pair authentication. It reads `V_ANAPLAN_*` views in `PROD_ANALYTICS.FINANCE_MT`. The simplest path is to add one more view for the weekly P&L. Abhishek and Simon then add an extract and an import on the Anaplan side.

## What is already in place (checked in Snowflake, read-only)

| Item | Value | Source |
| --- | --- | --- |
| Snowflake user | `ANAPLAN_SECURE`, key pair (`RSA_KEYPAIR`), no password | `SHOW USERS`, `LOGIN_HISTORY` |
| Client | JDBC driver, from one IP address (212.119.8.246) | `LOGIN_HISTORY`, last 60 days |
| Network policy | `ANAPLAN_POLICY` on the user | `SHOW PARAMETERS ... IN USER` |
| Roles granted | `LOADER_ROLE`, `ENGINEER_ROLE`, `ROBO_ANALYST_ROLE`, `ROBO_ENGINEER_ROLE` | `SHOW GRANTS TO USER` |
| Reads (Snowflake to Anaplan) | 13 views and tables in `PROD_ANALYTICS.FINANCE_MT`, for example `V_ANAPLAN_PL_ACTUAL`, `V_ANAPLAN_PL_ACTUAL_PFM`, `V_ANAPLAN_COST_CENTRE_REPORTING`. Last read: 2026-11-12. | `ACCESS_HISTORY` |
| Writes (Anaplan to Snowflake) | Tables in `DEV_RAW.ANAPLAN` and `PROD_RAW.ANAPLAN`, for example `ANAPLAN_PANDL_FORECAST`, `EXP02_WEEKLY_ACCOUNTS`, `ANAPLAN_FX_MONTH` | `QUERY_HISTORY` |
| Snowflake integrations for Anaplan | None | `SHOW INTEGRATIONS` |

Unknown: which Anaplan tool uses this connection. The Snowflake connector in Anaplan Data Orchestrator uses a user, a private key, a role, a warehouse and a database [1]. This matches what we see, but nobody has confirmed it.

Unknown: who owns the IP address 212.119.8.246.

## Options

### 1. Anaplan Data Orchestrator (ADO), Snowflake connector

ADO has a Snowflake connector. It imports a Snowflake table into a source dataset, with a read pipeline or a connection extract [1]. A transformation view then maps the data to the model, and a model link loads it [2].

What it needs:

- Licence: ADO is sold in packages. Each package has daily limits, for example 200 data extract syncs (soft limit) and 500 model links (soft limit) [3]. Unknown: how many packages Pilgrim's Europe has.
- Auth: key pair or user name and password. ADO needs the private key in unencrypted PEM format [4].
- Snowflake objects: a user, a role, a warehouse, a database and a schema [4].
- Network: Snowflake must accept connections from the Anaplan IP ranges for our Anaplan region [5]. Unknown: our Anaplan region.
- Anaplan role: Unknown for ADO. CloudWorks needs Integration Admin [6].
- Setup owner: Anaplan side, Abhishek and Simon. Snowflake side, a view and a grant to the role that the connection uses.

### 2. CloudWorks, through Azure Blob Storage

CloudWorks connects only to Amazon S3, Google BigQuery and Azure Blob Storage [7]. It has no Snowflake connector. To use it, Snowflake writes a file to Azure Blob. CloudWorks then imports the file.

What it needs:

- Snowflake: an export of the data to an Azure Blob container on a schedule. Our account already has Azure storage integrations.
- Auth: a shared access signature (SAS) token or OAuth 2.0 for the Blob container [7].
- Anaplan role: Integration Admin or Restricted Integration User, given by a Tenant Admin [6].
- Network: Anaplan inbound IP ranges on the storage firewall, if the storage limits traffic [5].

### 3. Anaplan Connect (command-line client)

Anaplan Connect is a command-line client. It runs imports, exports and processes from a batch file or a shell script [8]. It can run on a schedule, for example every Monday at 05:00 [8].

What it needs:

- A computer that we own, to run the client and the scheduler.
- A way to get the data from Snowflake to that computer. Unknown: if Anaplan Connect can read Snowflake directly. The user guide [8] was not read for this note.
- Anaplan credentials for the client. Anaplan Connect can use OAuth [8].

### 4. Anaplan Integration API v2.0 (bulk or transactional)

The Integration API is a set of REST endpoints. It can upload files and run imports. It can also write cell data or list items directly [9]. A Snowflake stored procedure could call this API through an external access integration. This is a design idea, not a tested path.

What it needs:

- Snowflake: an external access integration, a secret for the Anaplan credentials, and code to call the API.
- Anaplan: an integration user and the import action in the model.
- Owner: the Snowflake team writes and supports the code.

## Notes for the owners

- `ANAPLAN_SECURE` has user type `PERSON`. It also has `must_change_password = true` and the `ENGINEER_ROLE`. Snowflake recommends user type `SERVICE` for programs that connect with a key pair [10][11]. Ask the Snowflake admins if the user needs `ENGINEER_ROLE`.
- The ADO connector needs the private key in unencrypted form [4]. The key owner must keep it safe.

## Open questions for Abhishek and Simon

1. Which Anaplan tool uses `ANAPLAN_SECURE`?
2. How many ADO packages do we have, and how much of the daily allowance do we use?
3. Which Anaplan region is our tenant in?
4. Which module and import action receives the weekly P&L today?

## Sources

1. Anaplan, Import data from Snowflake: https://help.anaplan.com/import-data-from-snowflake-2fe1fcec-f5fb-4797-933c-ff08fd9a67ef
2. Anaplan, Import data with connectors: https://help.anaplan.com/import-data-with-connectors-b083efca-3856-4e44-bc61-277a01af5cb0
3. Anaplan, Tenant allowances for Anaplan Data Orchestrator: https://help.anaplan.com/tenant-allowances-for-anaplan-data-orchestrator-ea0ce7a9-dac4-4d34-8e3a-96cbc35526ee
4. Anaplan, Authentication options for Snowflake connections: https://help.anaplan.com/authentication-options-for-snowflake-connections-94d95c67-03f1-4c5f-92f1-e0670889d2eb
5. Anaplan, URL, IP, and allowlist requirements: https://support.anaplan.com/url-ip-and-allowlist-requirements-c8235c7d-8af2-413b-a9ff-d465978806b9
6. Anaplan, CloudWorks: https://help.anaplan.com/cloudworks-96f951fe-52fc-45a3-b6cb-16b7fe38e1aa
7. Anaplan, Create a CloudWorks connection: https://help.anaplan.com/create-a-cloudworks-connection--321a1107-f790-415b-bd33-0d933dc6e82d
8. Anaplan, Anaplan Connect: https://help.anaplan.com/anaplan-connect-e3a9f00c-3924-4cfb-aed0-1ec14233821b
9. Anaplan, Integration API v2.0: https://help.anaplan.com/integration-api-v20-3107aa54-d12b-4c48-9550-3561c84adbb2
10. Snowflake, User management: https://docs.snowflake.com/en/user-guide/admin-user-management
11. Snowflake, Key-pair authentication and key-pair rotation: https://docs.snowflake.com/en/user-guide/key-pair-auth
