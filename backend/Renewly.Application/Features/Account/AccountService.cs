using Renewly.Application.Common.Exceptions;
using Renewly.Application.Common.Interfaces;
using Renewly.Application.Features.Auth;
using Renewly.Application.Features.Entitlements;
using Renewly.Application.Features.Subscriptions;
using Renewly.Domain.Entities;

namespace Renewly.Application.Features.Account;

/// <summary>Removes a user's personal data (Google Play requires in-app account deletion).</summary>
public interface IUserDataEraser
{
    /// <summary>
    /// Atomically deletes subscriptions, reminders, notifications, devices, sessions and settings, and
    /// anonymises the user row. Plan and payment records are kept (anonymised) for financial compliance.
    /// </summary>
    Task EraseAsync(Guid userId, CancellationToken cancellationToken = default);
}

public interface IAccountService
{
    Task<UserDto> UpdateProfileAsync(UpdateProfileRequest request, CancellationToken cancellationToken = default);

    Task<NotificationSettingsDto> GetNotificationSettingsAsync(CancellationToken cancellationToken = default);

    Task<NotificationSettingsDto> UpdateNotificationSettingsAsync(UpdateNotificationSettingsRequest request, CancellationToken cancellationToken = default);

    Task<MyPlanDto> GetPlanAsync(CancellationToken cancellationToken = default);

    Task DeleteAccountAsync(DeleteAccountRequest request, CancellationToken cancellationToken = default);
}

internal sealed class AccountService(
    IUserRepository users,
    IUserSubscriptionRepository subscriptions,
    IReminderScheduler scheduler,
    IEntitlementService entitlementService,
    IPasswordHasher passwordHasher,
    IUserDataEraser eraser,
    IUnitOfWork unitOfWork,
    IAuditLogger audit,
    ICurrentUser currentUser) : IAccountService
{
    public async Task<UserDto> UpdateProfileAsync(UpdateProfileRequest request, CancellationToken cancellationToken = default)
    {
        var user = await GetUserAsync(cancellationToken);
        var timeZoneChanged = user.TimeZoneId != request.TimeZoneId;

        user.FullName = request.FullName.Trim();
        user.PreferredCurrency = request.PreferredCurrency;
        user.TimeZoneId = request.TimeZoneId;
        user.Language = request.Language;

        if (timeZoneChanged)
        {
            await RescheduleAllAsync(user, cancellationToken);
        }

        audit.Log("account.profile_updated", user.Id);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return UserDto.From(user);
    }

    public async Task<NotificationSettingsDto> GetNotificationSettingsAsync(CancellationToken cancellationToken = default)
    {
        var user = await GetUserAsync(cancellationToken);
        return NotificationSettingsDto.From(user.NotificationSettings ?? new UserNotificationSettings());
    }

    public async Task<NotificationSettingsDto> UpdateNotificationSettingsAsync(
        UpdateNotificationSettingsRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await GetUserAsync(cancellationToken);
        var entitlements = await entitlementService.GetAsync(user.Id, cancellationToken);

        if (request.DefaultReminderDaysBefore.Count > entitlements.MaxRemindersPerSubscription)
        {
            throw new BusinessRuleException(
                ErrorCodes.ProFeatureRequired,
                $"The {entitlements.PlanName} plan allows {entitlements.MaxRemindersPerSubscription} reminder per subscription. Upgrade to Pro for multiple reminders.");
        }

        var settings = user.NotificationSettings;
        if (settings is null)
        {
            settings = new UserNotificationSettings { UserId = user.Id };
            user.NotificationSettings = settings;
        }

        settings.PushEnabled = request.PushEnabled;
        settings.EmailEnabled = request.EmailEnabled;
        settings.DefaultReminderDaysBefore = request.DefaultReminderDaysBefore.Distinct().ToList();
        settings.ReminderTimeOfDay = new TimeOnly(request.ReminderTimeOfDay.Hour, request.ReminderTimeOfDay.Minute);
        settings.ProductUpdatesEmailEnabled = request.ProductUpdatesEmailEnabled;

        await RescheduleAllAsync(user, cancellationToken, entitlements);
        audit.Log("account.notification_settings_updated", user.Id);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return NotificationSettingsDto.From(settings);
    }

    public async Task<MyPlanDto> GetPlanAsync(CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequiredUserId;
        var entitlements = await entitlementService.GetAsync(userId, cancellationToken);
        var active = await subscriptions.CountActiveAsync(userId, cancellationToken);
        return new MyPlanDto(entitlements, active);
    }

    public async Task DeleteAccountAsync(DeleteAccountRequest request, CancellationToken cancellationToken = default)
    {
        var user = await GetUserAsync(cancellationToken);

        // 422 rather than 401 so the app does not treat a typo as an expired session.
        if (passwordHasher.Verify(user, user.PasswordHash, request.Password) == PasswordVerification.Failed)
        {
            throw new BusinessRuleException(ErrorCodes.InvalidCredentials, "Your password is incorrect.");
        }

        await eraser.EraseAsync(user.Id, cancellationToken);
        audit.Log("account.deleted", user.Id);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task RescheduleAllAsync(User user, CancellationToken cancellationToken, UserEntitlements? entitlements = null)
    {
        entitlements ??= await entitlementService.GetAsync(user.Id, cancellationToken);
        var context = ReminderContext.For(user, entitlements);
        foreach (var subscription in await subscriptions.ListActiveForUserAsync(user.Id, track: true, cancellationToken))
        {
            await scheduler.RescheduleAsync(subscription, context, cancellationToken);
        }
    }

    private async Task<User> GetUserAsync(CancellationToken cancellationToken) =>
        await users.GetWithSettingsAsync(currentUser.RequiredUserId, cancellationToken)
        ?? throw new UnauthorizedException(ErrorCodes.Unauthorized, "Your session is no longer valid. Please sign in again.");
}
