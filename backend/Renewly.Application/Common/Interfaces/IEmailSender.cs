namespace Renewly.Application.Common.Interfaces;

public sealed record EmailMessage(string ToAddress, string? ToName, string Subject, string HtmlBody, string TextBody);

public interface IEmailSender
{
    /// <summary>Sends an email. Throws on transport failure so callers can record the outcome.</summary>
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default);
}
