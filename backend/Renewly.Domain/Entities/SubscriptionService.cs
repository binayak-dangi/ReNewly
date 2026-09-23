using Renewly.Domain.Common;
using Renewly.Domain.Enums;

namespace Renewly.Domain.Entities;

/// <summary>
/// Catalog entry for a well-known third-party service (Netflix, Spotify, ...).
/// Holds cancellation guidance only; Renewly never controls the third-party account.
/// </summary>
public class SubscriptionService : BaseEntity
{
    public required string Name { get; set; }

    /// <summary>Stable, URL-safe identifier, e.g. "netflix". Used by seeding and the mobile app for logos.</summary>
    public required string Slug { get; set; }

    public SubscriptionCategory Category { get; set; }

    public string? WebsiteUrl { get; set; }

    public string? LogoUrl { get; set; }

    /// <summary>Hex colour used for the service avatar, e.g. "#E50914".</summary>
    public string? BrandColor { get; set; }

    /// <summary>Official page where the user manages or cancels the subscription.</summary>
    public string? CancellationUrl { get; set; }

    /// <summary>Ordered, human-readable cancellation steps.</summary>
    public List<string> CancellationSteps { get; set; } = [];

    /// <summary>Common plan names offered as suggestions in the add form.</summary>
    public List<string> SuggestedPlans { get; set; } = [];

    public bool IsActive { get; set; } = true;

    public int SortOrder { get; set; }
}
