using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Microsoft.Extensions.Logging;
using Renewly.Application.Common.Interfaces;

namespace Renewly.Infrastructure.Notifications;

/// <summary>Bound from the "Firebase" configuration section. Without credentials, pushes are only logged.</summary>
public sealed class FirebaseOptions
{
    public const string SectionName = "Firebase";

    /// <summary>Path to the service-account JSON downloaded from Firebase console → Project settings → Service accounts.</summary>
    public string? CredentialsPath { get; set; }

    /// <summary>Alternatively, the service-account JSON itself (e.g. from a secret store / env var).</summary>
    public string? CredentialsJson { get; set; }

    public string? ProjectId { get; set; }

    /// <summary>Must match the channel the Android app creates.</summary>
    public string AndroidChannelId { get; set; } = "renewal_reminders";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(CredentialsPath) || !string.IsNullOrWhiteSpace(CredentialsJson);
}

/// <summary>Firebase Cloud Messaging sender (HTTP v1 API via the Admin SDK).</summary>
internal sealed class FcmPushSender(FirebaseMessaging messaging, FirebaseOptions options, ILogger<FcmPushSender> logger) : IPushSender
{
    private const int MaxTokensPerRequest = 500;
    private const string BrandColor = "#0F766E";

    public async Task<PushSendResult> SendAsync(PushMessage message, CancellationToken cancellationToken = default)
    {
        var results = new List<PushTokenResult>(message.DeviceTokens.Count);

        foreach (var chunk in message.DeviceTokens.Chunk(MaxTokensPerRequest))
        {
            var multicast = new MulticastMessage
            {
                // FirebaseAdmin 3.6 marks registration tokens obsolete in favour of Firebase Installation IDs (Fids).
                // The app registers FCM registration tokens (messaging().getToken()), which FCM still accepts;
                // switch together with the mobile client if/when tokens are retired.
#pragma warning disable CS0618
                Tokens = chunk,
#pragma warning restore CS0618
                Notification = new Notification { Title = message.Title, Body = message.Body },
                Data = message.Data,
                Android = new AndroidConfig
                {
                    Priority = Priority.High,
                    Notification = new AndroidNotification
                    {
                        ChannelId = options.AndroidChannelId,
                        Color = BrandColor,
                        Tag = message.Data.TryGetValue("subscriptionId", out var tag) ? tag : null,
                    },
                },
            };

            try
            {
                var response = await messaging.SendEachForMulticastAsync(multicast, cancellationToken);
                for (var i = 0; i < chunk.Length; i++)
                {
                    results.Add(Map(chunk[i], response.Responses[i]));
                }
            }
            catch (Exception ex) when (ex is FirebaseException or HttpRequestException)
            {
                logger.LogWarning(ex, "FCM request failed for {Count} tokens", chunk.Length);
                results.AddRange(chunk.Select(t => new PushTokenResult(t, PushTokenOutcome.TransientFailure, ex.Message)));
            }
        }

        return new PushSendResult(results);
    }

    private static PushTokenResult Map(string token, SendResponse response)
    {
        if (response.IsSuccess)
        {
            return new PushTokenResult(token, PushTokenOutcome.Delivered, null);
        }

        var error = response.Exception;
        var outcome = error?.MessagingErrorCode switch
        {
            MessagingErrorCode.Unregistered or MessagingErrorCode.SenderIdMismatch or MessagingErrorCode.InvalidArgument
                => PushTokenOutcome.InvalidToken,
            _ => PushTokenOutcome.TransientFailure,
        };
        return new PushTokenResult(token, outcome, error?.Message);
    }
}

/// <summary>Development fallback when Firebase is not configured: logs the push and reports it delivered.</summary>
internal sealed class LoggingPushSender(ILogger<LoggingPushSender> logger) : IPushSender
{
    public Task<PushSendResult> SendAsync(PushMessage message, CancellationToken cancellationToken = default)
    {
        logger.LogWarning(
            "[DEV PUSH] {Count} device(s) | {Title} | {Body}",
            message.DeviceTokens.Count,
            message.Title,
            message.Body.Replace('\n', ' '));
        return Task.FromResult(new PushSendResult(
            message.DeviceTokens.Select(t => new PushTokenResult(t, PushTokenOutcome.Delivered, null)).ToList()));
    }
}
