using Renewly.Application.Common.Exceptions;
using Renewly.Application.Common.Interfaces;
using Renewly.Application.Common.Time;
using Renewly.Application.Features.Auth;
using Renewly.Application.Features.Catalog;
using Renewly.Application.Features.Entitlements;
using Renewly.Domain.Entities;
using Renewly.Domain.Enums;
using Renewly.Domain.Services;

namespace Renewly.Application.Features.Subscriptions;

public interface IUserSubscriptionService
{
    Task<IReadOnlyList<SubscriptionDto>> ListAsync(SubscriptionListQuery query, CancellationToken cancellationToken = default);

    Task<SubscriptionDetailDto> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<SubscriptionDetailDto> CreateAsync(SaveSubscriptionRequest request, CancellationToken cancellationToken = default);

    Task<SubscriptionDetailDto> UpdateAsync(Guid id, SaveSubscriptionRequest request, CancellationToken cancellationToken = default);

    /// <summary>Records that the user cancelled with the provider. Renewly itself cannot cancel third-party subscriptions.</summary>
    Task<SubscriptionDetailDto> MarkCancelledAsync(Guid id, CancellationToken cancellationToken = default);

    Task<SubscriptionDetailDto> ReactivateAsync(Guid id, CancellationToken cancellationToken = default);

    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    Task<CancellationGuideDto> GetCancellationGuideAsync(Guid id, CancellationToken cancellationToken = default);
}

internal sealed class UserSubscriptionService(
    IUserSubscriptionRepository subscriptions,
    ISubscriptionServiceRepository catalog,
    ISubscriptionReminderRepository reminders,
    IUserRepository users,
    IReminderScheduler scheduler,
    IEntitlementService entitlementService,
    IUnitOfWork unitOfWork,
    IAuditLogger audit,
    ICurrentUser currentUser,
    TimeProvider timeProvider) : IUserSubscriptionService
{
    public async Task<IReadOnlyList<SubscriptionDto>> ListAsync(SubscriptionListQuery query, CancellationToken cancellationToken = default)
    {
        var user = await GetUserAsync(cancellationToken);
        var today = UserClock.Today(timeProvider, user.TimeZoneId);
        var items = await subscriptions.ListForUserAsync(user.Id, query, cancellationToken);

        var dtos = items.Select(s => SubscriptionDto.From(s, today));

        // Renewal order uses the projected date, which the database cannot compute.
        dtos = query.Sort switch
        {
            SubscriptionSort.PriceHighToLow => dtos.OrderByDescending(d => d.MonthlyCost).ThenBy(d => d.ServiceName),
            SubscriptionSort.Name => dtos.OrderBy(d => d.ServiceName, StringComparer.OrdinalIgnoreCase),
            _ => dtos.OrderBy(d => d.Status).ThenBy(d => d.NextRenewalDate).ThenBy(d => d.ServiceName),
        };

        return dtos.ToList();
    }

    public async Task<SubscriptionDetailDto> GetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await GetUserAsync(cancellationToken);
        var subscription = await GetOwnedAsync(id, user.Id, cancellationToken);
        return await ToDetailAsync(subscription, user, cancellationToken);
    }

    public async Task<SubscriptionDetailDto> CreateAsync(SaveSubscriptionRequest request, CancellationToken cancellationToken = default)
    {
        var user = await GetUserAsync(cancellationToken);
        var entitlements = await entitlementService.GetAsync(user.Id, cancellationToken);
        var activeCount = await subscriptions.CountActiveAsync(user.Id, cancellationToken);
        await entitlementService.EnsureCanAddSubscriptionAsync(user.Id, activeCount, cancellationToken);

        var subscription = new UserSubscription { UserId = user.Id, ServiceName = string.Empty, Currency = request.Currency };
        await ApplyAsync(subscription, request, user, entitlements, cancellationToken);
        subscriptions.Add(subscription);

        await scheduler.RescheduleAsync(subscription, ReminderContext.For(user, entitlements), cancellationToken);
        audit.Log("subscription.created", user.Id, nameof(UserSubscription), subscription.Id.ToString());
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await ToDetailAsync(subscription, user, cancellationToken);
    }

    public async Task<SubscriptionDetailDto> UpdateAsync(Guid id, SaveSubscriptionRequest request, CancellationToken cancellationToken = default)
    {
        var user = await GetUserAsync(cancellationToken);
        var subscription = await GetOwnedAsync(id, user.Id, cancellationToken);
        var entitlements = await entitlementService.GetAsync(user.Id, cancellationToken);

        await ApplyAsync(subscription, request, user, entitlements, cancellationToken);
        await scheduler.RescheduleAsync(subscription, ReminderContext.For(user, entitlements), cancellationToken);
        audit.Log("subscription.updated", user.Id, nameof(UserSubscription), subscription.Id.ToString());
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await ToDetailAsync(subscription, user, cancellationToken);
    }

    public async Task<SubscriptionDetailDto> MarkCancelledAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await GetUserAsync(cancellationToken);
        var subscription = await GetOwnedAsync(id, user.Id, cancellationToken);

        if (subscription.Status != SubscriptionStatus.Cancelled)
        {
            subscription.MarkCancelled(timeProvider.GetUtcNow().UtcDateTime);
            await scheduler.CancelPendingAsync(subscription, cancellationToken);
            audit.Log("subscription.marked_cancelled", user.Id, nameof(UserSubscription), subscription.Id.ToString());
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return await ToDetailAsync(subscription, user, cancellationToken);
    }

    public async Task<SubscriptionDetailDto> ReactivateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await GetUserAsync(cancellationToken);
        var subscription = await GetOwnedAsync(id, user.Id, cancellationToken);

        if (!subscription.IsActive)
        {
            var activeCount = await subscriptions.CountActiveAsync(user.Id, cancellationToken);
            await entitlementService.EnsureCanAddSubscriptionAsync(user.Id, activeCount, cancellationToken);
            var entitlements = await entitlementService.GetAsync(user.Id, cancellationToken);

            subscription.Reactivate();
            subscription.RollRenewalForward(UserClock.Today(timeProvider, user.TimeZoneId));
            await scheduler.RescheduleAsync(subscription, ReminderContext.For(user, entitlements), cancellationToken);
            audit.Log("subscription.reactivated", user.Id, nameof(UserSubscription), subscription.Id.ToString());
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return await ToDetailAsync(subscription, user, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequiredUserId;
        var subscription = await GetOwnedAsync(id, userId, cancellationToken);

        await scheduler.CancelPendingAsync(subscription, cancellationToken);
        subscriptions.Remove(subscription); // Soft delete via interceptor.
        audit.Log("subscription.deleted", userId, nameof(UserSubscription), subscription.Id.ToString());
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<CancellationGuideDto> GetCancellationGuideAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var subscription = await GetOwnedAsync(id, currentUser.RequiredUserId, cancellationToken);
        return subscription.SubscriptionService is { } service
            ? CancellationGuideDto.From(service) with { ServiceName = subscription.ServiceName }
            : CancellationGuideDto.Generic(subscription.ServiceName);
    }

    private async Task ApplyAsync(
        UserSubscription subscription,
        SaveSubscriptionRequest request,
        User user,
        UserEntitlements entitlements,
        CancellationToken cancellationToken)
    {
        SubscriptionService? service = null;
        if (request.ServiceId is { } serviceId)
        {
            service = await catalog.GetByIdAsync(serviceId, cancellationToken);
            if (service is null || !service.IsActive)
            {
                throw new NotFoundException("Service", serviceId);
            }
        }

        var reminderDays = (request.ReminderDaysBefore
            ?? user.NotificationSettings?.DefaultReminderDaysBefore
            ?? [3]).Distinct().ToList();

        if (reminderDays.Count > entitlements.MaxRemindersPerSubscription)
        {
            // New subscriptions silently take the allowed defaults; an explicit request is an upsell.
            if (request.ReminderDaysBefore is null)
            {
                reminderDays = reminderDays.Take(entitlements.MaxRemindersPerSubscription).ToList();
            }
            else
            {
                throw new BusinessRuleException(
                    ErrorCodes.ProFeatureRequired,
                    $"The {entitlements.PlanName} plan allows {entitlements.MaxRemindersPerSubscription} reminder per subscription. Upgrade to Pro for multiple reminders.");
            }
        }

        if (request.EmailReminderEnabled && !entitlements.EmailReminders)
        {
            throw new BusinessRuleException(ErrorCodes.ProFeatureRequired, "Email reminders are a Pro feature. Upgrade to Pro to enable them.");
        }

        subscription.SubscriptionServiceId = service?.Id;
        subscription.SubscriptionService = service;
        subscription.ServiceName = string.IsNullOrWhiteSpace(request.ServiceName) ? service!.Name : request.ServiceName.Trim();
        subscription.PlanName = NullIfBlank(request.PlanName);
        subscription.Category = request.Category ?? service?.Category ?? SubscriptionCategory.Other;
        subscription.Price = request.Price;
        subscription.Currency = request.Currency;
        subscription.BillingCycle = request.BillingCycle;
        subscription.NextRenewalDate = BillingCalculator.NextRenewalOnOrAfter(
            request.NextRenewalDate, request.BillingCycle, UserClock.Today(timeProvider, user.TimeZoneId));
        subscription.PaymentMethodLabel = NullIfBlank(request.PaymentMethodLabel);
        subscription.Notes = NullIfBlank(request.Notes);
        subscription.ReminderDaysBefore = reminderDays;
        subscription.PushReminderEnabled = request.PushReminderEnabled;
        subscription.EmailReminderEnabled = request.EmailReminderEnabled;
    }

    private async Task<SubscriptionDetailDto> ToDetailAsync(UserSubscription subscription, User user, CancellationToken cancellationToken)
    {
        var today = UserClock.Today(timeProvider, user.TimeZoneId);
        var dto = SubscriptionDto.From(subscription, today);
        var schedule = subscription.IsActive
            ? await reminders.ListForRenewalAsync(subscription.Id, dto.NextRenewalDate, cancellationToken)
            : [];

        return new SubscriptionDetailDto(dto, schedule.Where(r => r.Status != ReminderStatus.Cancelled).Select(ReminderDto.From).ToList());
    }

    private async Task<User> GetUserAsync(CancellationToken cancellationToken) =>
        await users.GetWithSettingsAsync(currentUser.RequiredUserId, cancellationToken)
        ?? throw new UnauthorizedException(ErrorCodes.Unauthorized, "Your session is no longer valid. Please sign in again.");

    private async Task<UserSubscription> GetOwnedAsync(Guid id, Guid userId, CancellationToken cancellationToken) =>
        await subscriptions.GetForUserAsync(id, userId, cancellationToken)
        ?? throw new NotFoundException("Subscription", id);

    private static string? NullIfBlank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
