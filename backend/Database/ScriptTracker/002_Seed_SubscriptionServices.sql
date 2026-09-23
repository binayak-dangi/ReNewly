/* =============================================================================
   Script      : 002_Seed_SubscriptionServices.sql
   Purpose     : Insert / update the catalog of well-known services and their
                 official cancellation guidance.
   Target      : RenewlyDb (SQL Server)
   Depends on  : EF migration 20260923104308_InitialCreate
   Idempotent  : Yes (MERGE on Slug). Safe to re-run. IsActive is never
                 overwritten, so services deactivated in production stay off.
   Enum values : Category 1=Entertainment 2=Music 3=Productivity 4=AiTools
                 5=Shopping 6=CloudStorage 12=Design
   Columns     : CancellationSteps / SuggestedPlans are JSON string arrays.
   Review      : Providers change their account pages. Re-verify every
                 CancellationUrl periodically.
   ============================================================================= */
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

BEGIN TRANSACTION;

MERGE dbo.SubscriptionServices AS target
USING (VALUES
    ('netflix', N'Netflix', 1, '#E50914', N'https://www.netflix.com', N'https://www.netflix.com/cancelplan',
     N'["Standard with ads","Standard","Premium"]',
     N'["Sign in to Netflix in a web browser.","Open Account from your profile menu.","Select ''Cancel membership''.","Confirm by selecting ''Finish cancellation''.","You keep access until the end of the current billing period."]',
     10),

    ('spotify', N'Spotify', 2, '#1DB954', N'https://www.spotify.com', N'https://www.spotify.com/account/subscription/',
     N'["Individual","Duo","Family","Student"]',
     N'["Sign in to your Spotify account page in a web browser (cancellation is not available in the app).","Open ''Manage your subscription''.","Select ''Cancel subscription'' and follow the prompts.","Your account switches to Spotify Free at the end of the billing period."]',
     20),

    ('chatgpt', N'ChatGPT', 4, '#10A37F', N'https://chatgpt.com', N'https://chatgpt.com/#settings/Account',
     N'["Plus","Pro","Business"]',
     N'["Sign in to chatgpt.com in a web browser.","Open your profile menu and choose Settings.","Go to Account and find your subscription.","Select ''Manage'', then ''Cancel subscription'' and confirm."]',
     30),

    ('claude', N'Claude', 4, '#D97757', N'https://claude.ai', N'https://claude.ai/settings/billing',
     N'["Pro","Max","Team"]',
     N'["Sign in to claude.ai in a web browser.","Open Settings and select Billing.","Choose to cancel your plan and confirm.","You keep paid features until the end of the current billing period."]',
     40),

    ('youtube-premium', N'YouTube Premium', 1, '#FF0000', N'https://www.youtube.com/premium', N'https://www.youtube.com/paid_memberships',
     N'["Individual","Family","Student","Lite"]',
     N'["Sign in to YouTube and open ''Purchases and memberships''.","Select your YouTube Premium membership.","Choose ''Deactivate'' (or ''Cancel membership'') and continue to cancel.","Confirm the cancellation."]',
     50),

    ('amazon-prime', N'Amazon Prime', 5, '#00A8E1', N'https://www.amazon.com/prime', N'https://www.amazon.com/gp/primecentral',
     N'["Monthly","Annual","Prime Student"]',
     N'["Sign in to Amazon and open ''Your Prime Membership''.","Select ''Manage membership'', then ''End membership''.","Work through the confirmation screens until cancellation is confirmed.","Check your email for the cancellation confirmation."]',
     60),

    ('microsoft-365', N'Microsoft 365', 3, '#D83B01', N'https://www.microsoft.com/microsoft-365', N'https://account.microsoft.com/services',
     N'["Basic","Personal","Family"]',
     N'["Sign in to account.microsoft.com/services with the account used to subscribe.","Find Microsoft 365 and select ''Manage''.","Choose ''Cancel subscription'' (or turn off recurring billing).","Follow the prompts to confirm."]',
     70),

    ('adobe-creative-cloud', N'Adobe Creative Cloud', 12, '#FA0F00', N'https://www.adobe.com/creativecloud.html', N'https://account.adobe.com/plans',
     N'["All Apps","Photoshop","Photography","Acrobat Pro"]',
     N'["Sign in to account.adobe.com and open ''Plans and payment''.","Select ''Manage plan'' for the plan you want to end.","Choose ''Cancel your plan'' and follow the prompts.","Annual plans billed monthly may charge an early cancellation fee; review it before confirming."]',
     80),

    ('disney-plus', N'Disney+', 1, '#113CCF', N'https://www.disneyplus.com', N'https://www.disneyplus.com/account',
     N'["Basic","Premium"]',
     N'["Sign in to Disney+ in a web browser and open Account.","Select your subscription.","Choose ''Cancel subscription'' and confirm."]',
     90),

    ('google-one', N'Google One', 6, '#4285F4', N'https://one.google.com', N'https://one.google.com/settings',
     N'["100 GB","2 TB","AI Pro"]',
     N'["Open one.google.com and sign in.","Go to Settings and select ''Cancel membership''.","Confirm the cancellation."]',
     100),

    ('dropbox', N'Dropbox', 6, '#0061FF', N'https://www.dropbox.com', N'https://www.dropbox.com/account/plan',
     N'["Plus","Essentials","Business"]',
     N'["Sign in to dropbox.com and open your account settings.","Go to the Plan tab.","Select ''Cancel plan'' and follow the prompts."]',
     110),

    ('canva', N'Canva', 12, '#00C4CC', N'https://www.canva.com', N'https://www.canva.com/settings/billing-and-teams',
     N'["Pro","Teams"]',
     N'["Sign in to Canva and open Settings.","Go to ''Billing & plans''.","Select your plan, choose ''Cancel subscription'' and confirm."]',
     120),

    ('linkedin-premium', N'LinkedIn Premium', 3, '#0A66C2', N'https://www.linkedin.com/premium', N'https://www.linkedin.com/premium/manage/',
     N'["Career","Business"]',
     N'["Sign in to LinkedIn and open ''Manage Premium account''.","Select ''Cancel subscription''.","Follow the prompts to confirm."]',
     130)
) AS source (Slug, Name, Category, BrandColor, WebsiteUrl, CancellationUrl, SuggestedPlans, CancellationSteps, SortOrder)
ON target.Slug = source.Slug
WHEN MATCHED THEN UPDATE SET
    Name              = source.Name,
    Category          = source.Category,
    BrandColor        = source.BrandColor,
    WebsiteUrl        = source.WebsiteUrl,
    CancellationUrl   = source.CancellationUrl,
    SuggestedPlans    = source.SuggestedPlans,
    CancellationSteps = source.CancellationSteps,
    SortOrder         = source.SortOrder,
    UpdatedAtUtc      = SYSUTCDATETIME()
WHEN NOT MATCHED BY TARGET THEN INSERT
    (Id, Slug, Name, Category, BrandColor, WebsiteUrl, LogoUrl, CancellationUrl, SuggestedPlans, CancellationSteps,
     IsActive, SortOrder, CreatedAtUtc)
VALUES
    (NEWID(), source.Slug, source.Name, source.Category, source.BrandColor, source.WebsiteUrl, NULL, source.CancellationUrl,
     source.SuggestedPlans, source.CancellationSteps, 1, source.SortOrder, SYSUTCDATETIME());

-- Guard: every JSON column must be a valid array, or the API will fail to read the row.
IF EXISTS (SELECT 1 FROM dbo.SubscriptionServices WHERE ISJSON(CancellationSteps) = 0 OR ISJSON(SuggestedPlans) = 0)
BEGIN
    ROLLBACK TRANSACTION;
    THROW 50001, 'Invalid JSON in SubscriptionServices seed data. Nothing was applied.', 1;
END

COMMIT TRANSACTION;

PRINT '002_Seed_SubscriptionServices applied.';
