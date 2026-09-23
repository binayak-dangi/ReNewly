# Renewly

> **Know before you're charged. Cancel before you renew.**

Renewly is an Android app from **BYNQORA Technologies** that helps people avoid unwanted automatic
subscription renewals. Users record their subscriptions (Netflix, Spotify, ChatGPT, Claude, YouTube
Premium, Amazon Prime, Microsoft 365, Adobe, or any custom service). Renewly then reminds them before
each renewal and points them to the provider's official cancellation page.

What Renewly does **not** do:

- It never asks for or stores card numbers, CVVs, PINs or banking credentials. Only a masked label
  such as "Visa ****4521" is allowed.
- It never claims to cancel third-party subscriptions. Users cancel with the provider, and Renewly
  only records that they did ("Mark as cancelled").

## Repository layout

```
ReNewly/
├── backend/                  ASP.NET Core 9 Web API (Clean Architecture, SQL Server, EF Core)
│   ├── Renewly.Domain/         Entities, enums, pure business rules
│   ├── Renewly.Application/    Use cases, DTOs, validators, interfaces
│   ├── Renewly.Infrastructure/ EF Core, repositories, JWT, email, FCM, background worker
│   ├── Renewly.Api/            Controllers, middleware, auth, configuration
│   ├── Renewly.UnitTests/      xUnit tests
│   └── Database/ScriptTracker/ Hand-applied SQL scripts for reference data
└── frontend-mobile/          React Native (TypeScript) Android app (coming next)
```

## Tech stack

| Layer | Technology |
|---|---|
| Mobile | React Native, TypeScript, React Navigation, TanStack Query, Zustand, React Hook Form, Zod, Axios, Firebase Cloud Messaging |
| API | ASP.NET Core 9, FluentValidation, Serilog, OpenAPI with the Scalar reference UI |
| Data | SQL Server, Entity Framework Core 9 (migrations) and ScriptTracker SQL scripts (reference data) |
| Auth | JWT access tokens (15 min), rotating refresh tokens (30 days) with reuse detection, email verification by 6-digit code |
| Notifications | Firebase Cloud Messaging (push) and SMTP (email), delivered by a background worker |

## Quick start (backend)

Prerequisites: .NET SDK 9, SQL Server 2019 or later, `sqlcmd`.

```powershell
cd backend
dotnet tool restore
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Database=RenewlyDb;User Id=<user>;Password=<password>;TrustServerCertificate=True" --project Renewly.Api
dotnet user-secrets set "Jwt:SigningKey" "<random string, 32+ chars>" --project Renewly.Api

dotnet ef database update --project Renewly.Infrastructure --startup-project Renewly.Api
sqlcmd -S localhost -U <user> -P <password> -C -I -d RenewlyDb -i Database\ScriptTracker\001_Seed_SubscriptionPlans.sql
sqlcmd -S localhost -U <user> -P <password> -C -I -d RenewlyDb -i Database\ScriptTracker\002_Seed_SubscriptionServices.sql

dotnet run --project Renewly.Api --launch-profile http   # http://localhost:5080/scalar/v1
dotnet test
```

In Development, emails and push notifications are written to the console instead of being sent,
so verification codes and reminders can be tested without SMTP, Firebase or a phone.

More detail is in the [backend README](backend/README.md): configuration, every endpoint, business rules,
reminder delivery and migrations. The reference-data process is in
[ScriptTracker](backend/Database/ScriptTracker/README.md).

## Plans

| | Free | Pro |
|---|---|---|
| Subscriptions tracked | 5 active | Unlimited |
| Reminders per subscription | 1 (push) | 7, 3 and 1 days before, by push and email |
| Insights | Totals, next 30 days, by category | Plus a 12-month forecast, top subscriptions and billing-cycle mix |
| Receipt storage, cloud sync | – | ✓ (planned) |
| Ads | Yes | No |

Limits are data-driven (the `SubscriptionPlans` table). A user is Pro while an active `UserPlans` row
points to a Pro plan. Google Play Billing will create those rows, so no other code needs to change.

## Build status

| Stage | Scope | Status |
|---|---|---|
| 1 | Backend foundation: solution, 14-table schema, response envelope, error handling, catalog seed scripts | ✅ Done |
| 2 | Authentication: register, login, JWT with refresh-token rotation, email verification, password reset, lockout, rate limiting | ✅ Done |
| 3 | Core API: subscriptions, reminder scheduling, dashboard, calendar, insights, notifications, profile and settings, account deletion, devices | ✅ Done |
| 4 | Reminder delivery: background worker, FCM push, email, retries, renewal rollover | ✅ Done |
| 5 | Mobile foundation: React Native project, design system, navigation, API client, secure session, offline handling | ⏳ Next |
| 6 | Mobile screens: onboarding, auth, dashboard, subscriptions, cancellation assistance, calendar, insights, notifications, profile, premium | Planned |
| 7 | Push on device: FCM registration, notification channel, deep links | Planned |
| 8 | Release: Google Play Billing, signing, ProGuard, Data safety form, CI | Planned |

## Security and privacy principles

- Secrets such as connection strings, the JWT signing key, SMTP credentials and the Firebase
  service account come from user-secrets or environment variables. They are never committed.
- Passwords are hashed with PBKDF2 (ASP.NET Core Identity hasher). Refresh tokens and email codes
  are stored only as SHA-256 hashes.
- Users can delete their account in the app, which Google Play requires. This hard-deletes their
  subscriptions, reminders, notifications, devices and sessions, and anonymises the account row.
- Every endpoint that returns user data requires a verified email and only ever returns the caller's
  own records.

---

© BYNQORA Technologies. All rights reserved.
