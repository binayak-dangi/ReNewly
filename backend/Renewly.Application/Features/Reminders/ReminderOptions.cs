using System.ComponentModel.DataAnnotations;

namespace Renewly.Application.Features.Reminders;

/// <summary>Background reminder delivery. Bound from the "Reminders" configuration section.</summary>
public sealed class ReminderOptions
{
    public const string SectionName = "Reminders";

    /// <summary>Turn the background worker off on API instances that should not send (e.g. a read replica).</summary>
    public bool WorkerEnabled { get; set; } = true;

    [Range(10, 3600)]
    public int PollIntervalSeconds { get; set; } = 60;

    [Range(1, 1000)]
    public int BatchSize { get; set; } = 100;

    /// <summary>Delivery attempts per reminder before it is marked Failed.</summary>
    [Range(1, 10)]
    public int MaxAttempts { get; set; } = 3;

    /// <summary>First retry delay; doubles on each further attempt.</summary>
    [Range(1, 1440)]
    public int RetryBaseDelayMinutes { get; set; } = 5;

    /// <summary>A reminder stuck in Processing longer than this (crashed worker) is picked up again.</summary>
    [Range(1, 1440)]
    public int StaleClaimMinutes { get; set; } = 10;

    /// <summary>Reminders found this late (e.g. after downtime) are skipped rather than sent out of context.</summary>
    [Range(1, 168)]
    public int MaxLatenessHours { get; set; } = 24;
}
