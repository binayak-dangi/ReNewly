namespace Renewly.Application.Common.Time;

/// <summary>Converts between UTC and the user's IANA time zone. Unknown zones fall back to UTC.</summary>
public static class UserClock
{
    public static TimeZoneInfo Resolve(string? timeZoneId) =>
        timeZoneId is not null && TimeZoneInfo.TryFindSystemTimeZoneById(timeZoneId, out var tz) ? tz : TimeZoneInfo.Utc;

    /// <summary>The calendar date "today" for the user.</summary>
    public static DateOnly Today(TimeProvider timeProvider, string? timeZoneId)
    {
        var local = TimeZoneInfo.ConvertTimeFromUtc(timeProvider.GetUtcNow().UtcDateTime, Resolve(timeZoneId));
        return DateOnly.FromDateTime(local);
    }

    /// <summary>
    /// Converts a local wall-clock date/time to UTC. Times that do not exist (spring-forward gap)
    /// are moved forward by the gap; ambiguous times (fall-back) use the standard offset.
    /// </summary>
    public static DateTime ToUtc(DateOnly date, TimeOnly time, string? timeZoneId)
    {
        var tz = Resolve(timeZoneId);
        var local = date.ToDateTime(time, DateTimeKind.Unspecified);

        while (tz.IsInvalidTime(local))
        {
            local = local.AddMinutes(30);
        }

        return TimeZoneInfo.ConvertTimeToUtc(local, tz);
    }
}
