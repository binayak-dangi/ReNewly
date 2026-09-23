using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Renewly.Application.Features.Reminders;

namespace Renewly.Infrastructure.BackgroundJobs;

/// <summary>
/// Every <see cref="ReminderOptions.PollIntervalSeconds"/>: rolls passed renewals forward (which schedules the next
/// cycle's reminders), then delivers due reminders. Multiple instances are safe because reminders are claimed atomically.
/// </summary>
internal sealed class ReminderWorker(
    IServiceScopeFactory scopeFactory,
    IOptions<ReminderOptions> options,
    ILogger<ReminderWorker> logger) : BackgroundService
{
    private static readonly TimeSpan StartupDelay = TimeSpan.FromSeconds(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.WorkerEnabled)
        {
            logger.LogInformation("Reminder worker is disabled (Reminders:WorkerEnabled = false)");
            return;
        }

        logger.LogInformation("Reminder worker started; polling every {Seconds}s", options.Value.PollIntervalSeconds);

        try
        {
            await Task.Delay(StartupDelay, stoppingToken);
            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(options.Value.PollIntervalSeconds));
            do
            {
                await RunOnceAsync(stoppingToken);
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal shutdown.
        }
    }

    private async Task RunOnceAsync(CancellationToken stoppingToken)
    {
        try
        {
            // Separate scopes so a failure in one step never leaves stale tracked entities for the other.
            await using (var scope = scopeFactory.CreateAsyncScope())
            {
                await scope.ServiceProvider.GetRequiredService<IRenewalRolloverService>().RollForwardAsync(stoppingToken);
            }

            await using (var scope = scopeFactory.CreateAsyncScope())
            {
                await scope.ServiceProvider.GetRequiredService<IReminderDispatcher>().ProcessDueAsync(stoppingToken);
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Keep the worker alive; the next tick retries.
            logger.LogError(ex, "Reminder worker run failed");
        }
    }
}
