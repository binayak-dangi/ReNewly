using Renewly.Domain.Entities;
using Renewly.Domain.Enums;

namespace Renewly.Application.Features.Catalog;

public sealed record SubscriptionServiceDto(
    Guid Id,
    string Name,
    string Slug,
    SubscriptionCategory Category,
    string? WebsiteUrl,
    string? LogoUrl,
    string? BrandColor,
    IReadOnlyList<string> SuggestedPlans)
{
    public static SubscriptionServiceDto From(SubscriptionService s) =>
        new(s.Id, s.Name, s.Slug, s.Category, s.WebsiteUrl, s.LogoUrl, s.BrandColor, s.SuggestedPlans);
}

/// <summary>Guidance for cancelling a third-party subscription. Renewly cannot cancel on the user's behalf.</summary>
public sealed record CancellationGuideDto(
    Guid? ServiceId,
    string ServiceName,
    string? CancellationUrl,
    IReadOnlyList<string> Steps,
    string Disclaimer,
    string StoreBillingNote,
    string GooglePlaySubscriptionsUrl)
{
    public const string StandardDisclaimer =
        "Renewly does not control your subscription with this provider. " +
        "You must cancel directly with the provider; Renewly only helps you find where and how.";

    public const string StandardStoreBillingNote =
        "If you subscribed through Google Play or the Apple App Store, cancel it from that store instead.";

    public const string GooglePlayUrl = "https://play.google.com/store/account/subscriptions";

    public static CancellationGuideDto From(SubscriptionService s) =>
        new(s.Id, s.Name, s.CancellationUrl, s.CancellationSteps, StandardDisclaimer, StandardStoreBillingNote, GooglePlayUrl);

    /// <summary>Guidance for custom subscriptions that are not in the catalog.</summary>
    public static CancellationGuideDto Generic(string serviceName) => new(
        null,
        serviceName,
        null,
        [
            $"Sign in to your {serviceName} account on the provider's website or app.",
            "Open the account, billing, or subscription settings.",
            "Choose the option to cancel or turn off auto-renewal, and confirm.",
            "Keep the confirmation email or a screenshot as proof of cancellation.",
            "Come back to Renewly and tap \"Mark as cancelled\".",
        ],
        StandardDisclaimer,
        StandardStoreBillingNote,
        GooglePlayUrl);
}
