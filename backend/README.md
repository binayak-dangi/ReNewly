# Renewly API

ASP.NET Core 9 Web API for Renewly. It uses Clean Architecture on SQL Server with EF Core,
and JWT access tokens with rotating refresh tokens.

## Projects

| Project | Responsibility |
|---|---|
| `Renewly.Domain` | Entities, enums, pure business rules (`BillingCalculator`, `PaymentLabelPolicy`). No dependencies. |
| `Renewly.Application` | Use-case services, DTOs, FluentValidation validators, repository and service interfaces. |
| `Renewly.Infrastructure` | EF Core `RenewlyDbContext`, entity configurations, migrations, repositories, JWT, password hashing, email. |
| `Renewly.Api` | Controllers, `ApiResponse<T>` envelope, global exception handler, authentication, rate limiting, OpenAPI. |
| `Renewly.UnitTests` | xUnit tests. |
| `Database/ScriptTracker` | Hand-applied SQL scripts for reference data (plans, service catalog). **The app never seeds data itself.** |

## First-time setup

```powershell
cd backend
dotnet tool restore

# Secrets live in user-secrets (outside the repo), never in appsettings
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Database=RenewlyDb;User Id=sa;Password=<password>;TrustServerCertificate=True" --project Renewly.Api
dotnet user-secrets set "Jwt:SigningKey" "<random string, 32+ chars>" --project Renewly.Api

# Create or upgrade the schema
dotnet ef database update --project Renewly.Infrastructure --startup-project Renewly.Api

# Load reference data (see Database/ScriptTracker/README.md)
sqlcmd -S localhost -U sa -P <password> -C -I -d RenewlyDb -i Database\ScriptTracker\001_Seed_SubscriptionPlans.sql
sqlcmd -S localhost -U sa -P <password> -C -I -d RenewlyDb -i Database\ScriptTracker\002_Seed_SubscriptionServices.sql
```

## Run and test

```powershell
dotnet run --project Renewly.Api --launch-profile http   # http://localhost:5080
dotnet test
```

- API reference (Development only): http://localhost:5080/scalar/v1
- Health: `/health/live` (process) and `/health/ready` (database)
- Android emulator base URL: `http://10.0.2.2:5080/api/v1`

In Development, emails are **written to the console log** instead of being sent
(`Email:Provider = Log`), so verification and reset codes appear in the API output.

## Configuration / environment variables

Environment variables use `__` as the section separator (e.g. `Jwt__SigningKey`).

| Key | Required | Default | Notes |
|---|---|---|---|
| `ConnectionStrings__DefaultConnection` | ✅ | – | SQL Server connection string |
| `Jwt__SigningKey` | ✅ | – | ≥ 32 chars, HMAC-SHA256. Keep secret and rotate if leaked. |
| `Jwt__Issuer` / `Jwt__Audience` | | `renewly-api` / `renewly-mobile` | |
| `Jwt__AccessTokenMinutes` | | `15` | |
| `Auth__RefreshTokenDays` | | `30` | |
| `Auth__EmailVerificationCodeMinutes` | | `1440` | |
| `Auth__PasswordResetCodeMinutes` | | `15` | |
| `Auth__MaxFailedLoginAttempts` / `Auth__LockoutMinutes` | | `5` / `15` | |
| `Email__Provider` | | `Smtp` (`Log` in Development) | `Smtp` or `Log` |
| `Email__FromAddress` / `Email__FromName` | | `no-reply@renewly.app` / `Renewly` | |
| `Email__Smtp__Host` / `Port` / `Username` / `Password` / `UseStartTls` | when `Smtp` | – / 587 / – / – / true | Works with SendGrid, SES, Mailgun, etc. |
| `Firebase__CredentialsPath` **or** `Firebase__CredentialsJson` | for real push | – | Service-account JSON (Firebase console → Project settings → Service accounts). Without it, pushes are only logged. |
| `Firebase__ProjectId` | | from credentials | |
| `Firebase__AndroidChannelId` | | `renewal_reminders` | Must match the channel the app creates |
| `Reminders__WorkerEnabled` | | `true` | Set `false` on instances that should not send |
| `Reminders__PollIntervalSeconds` | | `60` | |
| `Reminders__BatchSize` / `MaxAttempts` / `RetryBaseDelayMinutes` | | `100` / `3` / `5` | Retries back off 5 → 10 → 20 min |
| `Reminders__StaleClaimMinutes` / `MaxLatenessHours` | | `10` / `24` | Crash recovery / don't send reminders that are hours late |

## Adding a migration

```powershell
dotnet ef migrations add <Name> --project Renewly.Infrastructure --startup-project Renewly.Api --output-dir Persistence/Migrations
dotnet ef database update --project Renewly.Infrastructure --startup-project Renewly.Api
# Production: generate a reviewed, idempotent script instead of running update directly
dotnet ef migrations script --idempotent --project Renewly.Infrastructure --startup-project Renewly.Api -o migrate.sql
```

## Authentication flow

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/v1/auth/register` | – | Creates an account, emails a 6-digit code, and returns a session |
| `POST /api/v1/auth/login` | – | Returns a session. Locks the account for 15 min after 5 failures. |
| `POST /api/v1/auth/refresh` | – | Rotates the refresh token. Replaying an old token revokes the whole session family. |
| `POST /api/v1/auth/logout` | – | Revokes the session that owns the refresh token |
| `POST /api/v1/auth/verify-email` | Bearer | Checks the code and returns a new session with `email_verified=true` |
| `POST /api/v1/auth/resend-verification` | Bearer | 60-second cooldown |
| `POST /api/v1/auth/forgot-password` | – | Always responds with success, so it can't be used to find accounts |
| `POST /api/v1/auth/reset-password` | – | Sets a new password and signs out all devices |
| `POST /api/v1/auth/change-password` | Bearer | Signs out other devices and returns a new session |

Credential endpoints are rate limited to 10 requests per minute per IP.

## Core API

🔒 = requires a verified email (`VerifiedEmail` policy). Unverified users get `403 EMAIL_NOT_VERIFIED`.

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/v1/meta` | – | Currencies, languages, reminder offsets (7/3/1), categories and billing cycles for pickers |
| `GET /api/v1/services?search=&category=` | – | Service catalog (from ScriptTracker/002) |
| `GET /api/v1/services/{id}/cancellation-guide` | – | Official cancellation URL and steps |
| `GET /api/v1/plans` | – | Free / Pro plans for the Premium screen |
| `GET /api/v1/dashboard` | 🔒 | Next renewal, upcoming 30 days, monthly/yearly totals, due in 7 days, recent notifications, plan usage |
| `GET/POST /api/v1/subscriptions` | 🔒 | List (`status`, `search`, `sort`) and create |
| `GET/PUT/DELETE /api/v1/subscriptions/{id}` | 🔒 | Detail (with reminder schedule), update, soft delete |
| `POST /api/v1/subscriptions/{id}/mark-cancelled` | 🔒 | User confirms they cancelled with the provider; reminders stop |
| `POST /api/v1/subscriptions/{id}/reactivate` | 🔒 | Undo "mark cancelled" (subject to the plan limit) |
| `GET /api/v1/subscriptions/{id}/cancellation-guide` | 🔒 | Catalog guide, or generic steps for custom subscriptions |
| `GET /api/v1/calendar?from=yyyy-MM-dd&to=yyyy-MM-dd` | 🔒 | Projected renewals in range (max 366 days) and totals |
| `GET /api/v1/insights` | 🔒 | Totals, next 30 days, spend by category. `advanced` (12-month forecast, top 5, cycle mix) is Pro only. |
| `GET /api/v1/notifications?page=&pageSize=&status=&unreadOnly=&channel=` | 🔒 | Notification history (paged) |
| `GET /api/v1/notifications/unread-count` · `POST /{id}/read` · `POST /read-all` | 🔒 | Read state |
| `GET /api/v1/me` · `PUT /me/profile` | Bearer | Profile (name, currency, time zone, language). A time zone change reschedules reminders. |
| `GET/PUT /api/v1/me/notification-settings` | Bearer | Push/email toggles, default reminders, local reminder time. Changes reschedule reminders. |
| `GET /api/v1/me/plan` | Bearer | Entitlements and usage (e.g. 3 of 5 subscriptions) |
| `POST /api/v1/me/delete` | Bearer | Password-confirmed account deletion (Google Play requirement) |
| `POST /api/v1/devices` · `POST /devices/unregister` | Bearer | FCM token registration |

### Business rules

- **Free plan:** 5 active subscriptions (`422 PLAN_LIMIT_REACHED`), 1 reminder per subscription and push only.
  More reminders or email reminders return `422 PRO_FEATURE_REQUIRED`. Limits come from `SubscriptionPlans`,
  and a user is Pro while an active `UserPlans` row points to a Pro plan (Google Play Billing will create these).
- **Money totals are per currency.** Renewly does not convert currencies; the preferred currency is listed first.
- **Reminders** are stored in `SubscriptionReminders`, one row per renewal, offset and channel, due at the user's
  local reminder time and converted to UTC. They are recalculated whenever the subscription, time zone, settings
  or plan changes. Offsets already in the past are skipped. A reminder already sent is never sent again.
- **Past renewal dates** are rolled forward automatically (month-end safe: Jan 31 → Feb 28 → Mar 31).
- **Payment labels** accept at most 4 digits in total ("Visa ****4521"), so card numbers and CVVs are rejected.
- **Account deletion** hard-deletes subscriptions, reminders, notifications, devices, sessions and settings, and
  anonymises the user row. Plan and payment records are kept for accounting.

## Reminder delivery (background worker)

`ReminderWorker` (a hosted service inside the API) runs every `PollIntervalSeconds`:

1. **Roll renewals forward.** Active subscriptions whose renewal day has passed in the user's time zone
   move to their next renewal date, and reminders for that cycle are scheduled.
2. **Deliver due reminders.**
   - Stale claims (a crashed worker) are released first.
   - Due rows are then claimed atomically (`Scheduled → Processing`), so several API instances can run
     the worker without sending anything twice.
   - Each claimed reminder is re-checked before sending. It is **skipped** if the subscription was deleted
     or marked cancelled, the renewal date changed, the channel was turned off or is no longer on the plan,
     the renewal has passed, or the reminder is more than 24 hours late.
3. **Send and record.** A push goes to every registered device through FCM, and an email through SMTP (Pro).
   Each attempt creates or updates a `NotificationLogs` row (`Pending → Sent / Failed`), which is what the
   in-app notification centre shows.
   - Device tokens that FCM rejects are removed.
   - Temporary errors are retried with back-off, up to `MaxAttempts`.
   - With no device registered, the push is marked Failed, but the notification still appears in the app.

Push payload (`data`), used by the app to open the right screen:

```json
{ "type": "renewal_reminder", "notificationId": "...", "subscriptionId": "...",
  "renewalDate": "2026-09-26", "deepLink": "renewly://subscriptions/{id}" }
```

Example wording:

```
Netflix renews in 3 days
Amount: $15.99
Renewal date: September 26
```

In Development without Firebase credentials, pushes are written to the log as `[DEV PUSH] ...`
(and emails as `[DEV EMAIL] ...`), so the whole flow can be tested without a phone.

