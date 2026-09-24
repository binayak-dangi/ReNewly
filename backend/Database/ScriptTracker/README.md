# Script Tracker

Hand-applied SQL scripts for **reference data** (plans, service catalog, and future data fixes).
The application never inserts seed data itself. Schema changes stay in EF Core migrations
(`Renewly.Infrastructure/Persistence/Migrations`).

## Rules

1. Name scripts `NNN_Verb_Subject.sql` with a 3-digit sequence. Never renumber or edit a script
   that has already been applied to production; add a new one instead.
2. Every script must be **idempotent** (use `MERGE` or `IF NOT EXISTS`) and wrapped in a transaction.
3. Record each run in the log below (environment, date, who).

## Order of execution

Run after `dotnet ef database update` has created or updated the schema.

| # | Script | Depends on | Description |
|---|--------|-----------|-------------|
| 001 | `001_Seed_SubscriptionPlans.sql` | Migration `InitialCreate` | Free / Pro Monthly / Pro Yearly plans and feature limits |
| 002 | `002_Seed_SubscriptionServices.sql` | Migration `InitialCreate` | Netflix, Spotify, ChatGPT, Claude, YouTube Premium, Amazon Prime, Microsoft 365, Adobe CC, Disney+, Google One, Dropbox, Canva, LinkedIn Premium, with official cancellation URLs and steps |

## How to run

```powershell
# Local (SQL authentication; -I enables QUOTED_IDENTIFIER, required by filtered indexes)
sqlcmd -S localhost -U sa -P <password> -C -I -d RenewlyDb -i backend\Database\ScriptTracker\001_Seed_SubscriptionPlans.sql
sqlcmd -S localhost -U sa -P <password> -C -I -d RenewlyDb -i backend\Database\ScriptTracker\002_Seed_SubscriptionServices.sql

# Remote
sqlcmd -S <server> -U <user> -P <password> -C -I -d RenewlyDb -i <script>
```

You can also open the scripts in SSMS or Azure Data Studio and execute them against `RenewlyDb`.

## Execution log

| Script | Environment | Applied on (UTC) | Applied by | Notes |
|--------|-------------|------------------|------------|-------|
| 001 | Local (`localhost`, `RenewlyDb`) | 2026-09-24 | Binayak Dangi | 3 plans: FREE, PRO_MONTHLY, PRO_YEARLY |
| 002 | Local (`localhost`, `RenewlyDb`) | 2026-09-24 | Binayak Dangi | 13 services with cancellation guides |
