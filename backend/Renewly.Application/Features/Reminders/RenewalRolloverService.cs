using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Renewly.Application.Common.Interfaces;
using Renewly.Application.Common.Time;
using Renewly.Application.Features.Entitlements;
using Renewly.Application.Features.Subscriptions;

namespace Renewly.Application.Features.Reminders;

public interface IRenewalRolloverService
{
    /// <summary>
    /// Moves active subscriptions whose renewal day has passed (in the user's time zone) to their next
    /// renewal date and schedules reminders for it. Returns the number of subscriptions rolled forward.
    /// </summary>
    Task<int> RollForwardAsync(CancellationToken cancellationToken = default);
}

internal sealed class RenewalRolloverService(
    IReminderDispatchRepository repository,
    IReminderScheduler scheduler,
    IEntitlementService entitlementService,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    IOptions<ReminderOptions> options,
    ILogger<RenewalRolloverService> logger) : IRenewalRolloverService
{
    private const int MaxBatchesPerRun = 20;

    public async Task<int> RollForwardAsync(CancellationToken cancellationToken = default)
    {
        // Time zones run up to UTC+14, so a renewal dated "today in UTC" may already be yesterday for some users.
        var candidatesBefore = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime).AddDays(1);
        var total = 0;

        for (var batchNumber = 0; batchNumber < MaxBatchesPerRun; batchNumber++)
        {
            var batch = await repository.ListDueForRolloverAsync(candidatesBefore, options.Value.BatchSize, cancellationToken);
            var rolled = 0;

            foreach (var subscription in batch)
            {
                var user = subscription.User!;
                if (!subscription.RollRenewalForward(UserClock.Today(timeProvider, user.TimeZoneId)))
                {
                    continue; // Renewal day has not passed yet in this user's time zone.
                }

                var entitlements = await entitlementService.GetAsync(user.Id, cancellationToken);
                await scheduler.RescheduleAsync(subscription, ReminderContext.For(user, entitlements), cancellationToken);
                rolled++;
            }

            await unitOfWork.SaveChangesAsync(cancellationToken);
            total += rolled;

            // Stop when the batch was not full, or nothing in it could move (all waiting on their time zone).
            if (batch.Count < options.Value.BatchSize || rolled == 0)
            {
                break;
            }
        }

        if (total > 0)
        {
            logger.LogInformation("Rolled {Count} subscriptions forward to their next renewal", total);
        }

        return total;
    }
}
