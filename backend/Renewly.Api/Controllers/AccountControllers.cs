using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Renewly.Api.Contracts;
using Renewly.Api.Infrastructure;
using Renewly.Application.Common.Validation;
using Renewly.Application.Features.Account;
using Renewly.Application.Features.Auth;
using Renewly.Application.Features.Devices;
using Renewly.Application.Features.Subscriptions;
using Renewly.Domain.Enums;

namespace Renewly.Api.Controllers;

/// <summary>The signed-in user's profile, preferences and plan. Available before email verification.</summary>
[Route(ApiPrefix + "/me")]
public sealed class MeController(IAccountService account, IAuthService auth) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<UserDto>>> Get(CancellationToken cancellationToken) =>
        Success(await auth.GetCurrentUserAsync(cancellationToken));

    [HttpPut("profile")]
    public async Task<ActionResult<ApiResponse<UserDto>>> UpdateProfile(UpdateProfileRequest request, CancellationToken cancellationToken) =>
        Success(await account.UpdateProfileAsync(request, cancellationToken), "Profile updated.");

    [HttpGet("notification-settings")]
    public async Task<ActionResult<ApiResponse<NotificationSettingsDto>>> GetNotificationSettings(CancellationToken cancellationToken) =>
        Success(await account.GetNotificationSettingsAsync(cancellationToken));

    [HttpPut("notification-settings")]
    public async Task<ActionResult<ApiResponse<NotificationSettingsDto>>> UpdateNotificationSettings(
        UpdateNotificationSettingsRequest request,
        CancellationToken cancellationToken) =>
        Success(await account.UpdateNotificationSettingsAsync(request, cancellationToken), "Notification settings saved.");

    [HttpGet("plan")]
    public async Task<ActionResult<ApiResponse<MyPlanDto>>> GetPlan(CancellationToken cancellationToken) =>
        Success(await account.GetPlanAsync(cancellationToken));

    /// <summary>Permanently deletes the account and personal data (required by Google Play).</summary>
    [EnableRateLimiting(SecuritySetup.AuthRateLimitPolicy)]
    [HttpPost("delete")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(DeleteAccountRequest request, CancellationToken cancellationToken)
    {
        await account.DeleteAccountAsync(request, cancellationToken);
        return Success("Your account and data have been deleted.");
    }
}

/// <summary>Firebase Cloud Messaging registrations for push reminders.</summary>
[Route(ApiPrefix + "/devices")]
public sealed class DevicesController(IDeviceService devices) : ApiControllerBase
{
    [HttpPost]
    public async Task<ActionResult<ApiResponse<object>>> Register(RegisterDeviceRequest request, CancellationToken cancellationToken)
    {
        await devices.RegisterAsync(request, cancellationToken);
        return Success("Device registered for notifications.");
    }

    [HttpPost("unregister")]
    public async Task<ActionResult<ApiResponse<object>>> Unregister(UnregisterDeviceRequest request, CancellationToken cancellationToken)
    {
        await devices.UnregisterAsync(request, cancellationToken);
        return Success();
    }
}

public sealed record OptionDto(string Value, string Label);

public sealed record AppMetadataDto(
    IReadOnlyCollection<string> Currencies,
    IReadOnlyList<string> Languages,
    IReadOnlyList<int> ReminderDaysBefore,
    IReadOnlyList<OptionDto> Categories,
    IReadOnlyList<OptionDto> BillingCycles);

/// <summary>Static lists the app uses to build pickers, so they stay in sync with server validation.</summary>
[AllowAnonymous]
[Route(ApiPrefix + "/meta")]
public sealed class MetaController : ApiControllerBase
{
    private static readonly AppMetadataDto Metadata = new(
        Currencies.All.Order(StringComparer.Ordinal).ToList(),
        Languages.Supported,
        ReminderPlanner.AllowedDaysBefore,
        [
            new(nameof(SubscriptionCategory.Entertainment), "Entertainment"),
            new(nameof(SubscriptionCategory.Music), "Music"),
            new(nameof(SubscriptionCategory.Productivity), "Productivity"),
            new(nameof(SubscriptionCategory.AiTools), "AI tools"),
            new(nameof(SubscriptionCategory.Shopping), "Shopping"),
            new(nameof(SubscriptionCategory.CloudStorage), "Cloud storage"),
            new(nameof(SubscriptionCategory.Education), "Education"),
            new(nameof(SubscriptionCategory.News), "News"),
            new(nameof(SubscriptionCategory.Fitness), "Fitness"),
            new(nameof(SubscriptionCategory.Gaming), "Gaming"),
            new(nameof(SubscriptionCategory.Utilities), "Utilities"),
            new(nameof(SubscriptionCategory.Design), "Design"),
            new(nameof(SubscriptionCategory.Finance), "Finance"),
            new(nameof(SubscriptionCategory.Other), "Other"),
        ],
        [
            new(nameof(BillingCycle.Weekly), "Weekly"),
            new(nameof(BillingCycle.Monthly), "Monthly"),
            new(nameof(BillingCycle.Quarterly), "Every 3 months"),
            new(nameof(BillingCycle.SemiAnnually), "Every 6 months"),
            new(nameof(BillingCycle.Yearly), "Yearly"),
        ]);

    [HttpGet]
    [ResponseCache(Duration = 3600)]
    public ActionResult<ApiResponse<AppMetadataDto>> Get() => Success(Metadata);
}
