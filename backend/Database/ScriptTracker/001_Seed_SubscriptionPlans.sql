/* =============================================================================
   Script      : 001_Seed_SubscriptionPlans.sql
   Purpose     : Insert / update Renewly's own plans (Free, Pro Monthly, Pro Yearly).
   Target      : RenewlyDb (SQL Server)
   Depends on  : EF migration 20260923104308_InitialCreate
   Idempotent  : Yes (MERGE on Code). Safe to re-run.
   Enum values : Tier 1=Free 2=Pro | BillingCycle 2=Monthly 5=Yearly
   Note        : Prices are placeholders. Once Google Play Billing is live, the
                 Play Console price is the source of truth for what users pay.
   ============================================================================= */
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

BEGIN TRANSACTION;

MERGE dbo.SubscriptionPlans AS target
USING (VALUES
    -- Code,          Name,          Description,                                                                   Tier, Price, Currency, BillingCycle, MaxSubs, MaxReminders, Email, Analytics, Receipts, Sync, Ads, PlayProductId,         SortOrder
    ('FREE',        N'Free',        N'Track up to 5 subscriptions with push reminders.',                            1,  0.00, 'USD', NULL, 5,    1, 0, 0, 0, 0, 1, NULL,                  1),
    ('PRO_MONTHLY', N'Pro Monthly', N'Unlimited subscriptions, email and multiple reminders, advanced insights.',   2,  2.99, 'USD', 2,    NULL, 3, 1, 1, 1, 1, 0, 'renewly_pro_monthly', 2),
    ('PRO_YEARLY',  N'Pro Yearly',  N'Everything in Pro, billed yearly.',                                           2, 24.99, 'USD', 5,    NULL, 3, 1, 1, 1, 1, 0, 'renewly_pro_yearly',  3)
) AS source (Code, Name, Description, Tier, Price, Currency, BillingCycle, MaxSubscriptions, MaxRemindersPerSubscription,
             EmailRemindersEnabled, AdvancedAnalyticsEnabled, ReceiptStorageEnabled, CloudSyncEnabled, AdsEnabled,
             GooglePlayProductId, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET
    Name                        = source.Name,
    Description                 = source.Description,
    Tier                        = source.Tier,
    Price                       = source.Price,
    Currency                    = source.Currency,
    BillingCycle                = source.BillingCycle,
    MaxSubscriptions            = source.MaxSubscriptions,
    MaxRemindersPerSubscription = source.MaxRemindersPerSubscription,
    EmailRemindersEnabled       = source.EmailRemindersEnabled,
    AdvancedAnalyticsEnabled    = source.AdvancedAnalyticsEnabled,
    ReceiptStorageEnabled       = source.ReceiptStorageEnabled,
    CloudSyncEnabled            = source.CloudSyncEnabled,
    AdsEnabled                  = source.AdsEnabled,
    GooglePlayProductId         = source.GooglePlayProductId,
    SortOrder                   = source.SortOrder,
    UpdatedAtUtc                = SYSUTCDATETIME()
WHEN NOT MATCHED BY TARGET THEN INSERT
    (Id, Code, Name, Description, Tier, Price, Currency, BillingCycle, MaxSubscriptions, MaxRemindersPerSubscription,
     EmailRemindersEnabled, AdvancedAnalyticsEnabled, ReceiptStorageEnabled, CloudSyncEnabled, AdsEnabled,
     GooglePlayProductId, IsActive, SortOrder, CreatedAtUtc)
VALUES
    (NEWID(), source.Code, source.Name, source.Description, source.Tier, source.Price, source.Currency, source.BillingCycle,
     source.MaxSubscriptions, source.MaxRemindersPerSubscription, source.EmailRemindersEnabled, source.AdvancedAnalyticsEnabled,
     source.ReceiptStorageEnabled, source.CloudSyncEnabled, source.AdsEnabled, source.GooglePlayProductId, 1, source.SortOrder,
     SYSUTCDATETIME());

COMMIT TRANSACTION;

PRINT '001_Seed_SubscriptionPlans applied.';
