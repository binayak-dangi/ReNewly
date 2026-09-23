namespace Renewly.Application.Common.Interfaces;

/// <summary>A push notification for one user, fanned out to all of their devices.</summary>
public sealed record PushMessage(
    IReadOnlyList<string> DeviceTokens,
    string Title,
    string Body,
    IReadOnlyDictionary<string, string> Data);

public enum PushTokenOutcome
{
    Delivered,

    /// <summary>The token is no longer valid (app uninstalled, token rotated); the device should be removed.</summary>
    InvalidToken,

    /// <summary>Temporary failure (quota, unavailable); retrying later may succeed.</summary>
    TransientFailure,
}

public sealed record PushTokenResult(string Token, PushTokenOutcome Outcome, string? Error);

public sealed record PushSendResult(IReadOnlyList<PushTokenResult> Results)
{
    public int DeliveredCount => Results.Count(r => r.Outcome == PushTokenOutcome.Delivered);

    public IEnumerable<string> InvalidTokens => Results.Where(r => r.Outcome == PushTokenOutcome.InvalidToken).Select(r => r.Token);

    public string? FirstError => Results.FirstOrDefault(r => r.Error is not null)?.Error;
}

public interface IPushSender
{
    /// <summary>Sends to every token. Per-token outcomes are returned rather than thrown.</summary>
    Task<PushSendResult> SendAsync(PushMessage message, CancellationToken cancellationToken = default);
}
