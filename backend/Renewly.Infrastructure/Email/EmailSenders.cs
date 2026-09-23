using System.ComponentModel.DataAnnotations;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using Renewly.Application.Common.Interfaces;

namespace Renewly.Infrastructure.Email;

/// <summary>Bound from the "Email" configuration section.</summary>
public sealed class EmailOptions
{
    public const string SectionName = "Email";

    /// <summary>"Log" writes emails to the application log (development); "Smtp" delivers them.</summary>
    public string Provider { get; set; } = "Log";

    [Required]
    [EmailAddress]
    public string FromAddress { get; set; } = "no-reply@renewly.app";

    public string FromName { get; set; } = "Renewly";

    public SmtpSettings Smtp { get; set; } = new();

    public sealed class SmtpSettings
    {
        public string Host { get; set; } = string.Empty;

        public int Port { get; set; } = 587;

        public string? Username { get; set; }

        public string? Password { get; set; }

        /// <summary>Use STARTTLS on port 587 (true) or implicit TLS on 465 (false with Port 465).</summary>
        public bool UseStartTls { get; set; } = true;
    }
}

/// <summary>Development sender: logs the message (including one-time codes) instead of sending it.</summary>
internal sealed class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IEmailSender
{
    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        logger.LogWarning(
            "[DEV EMAIL] To: {To} | Subject: {Subject}\n{Body}",
            message.ToAddress,
            message.Subject,
            message.TextBody);
        return Task.CompletedTask;
    }
}

/// <summary>SMTP sender (works with SendGrid, Amazon SES, Mailgun, Microsoft 365, etc.).</summary>
internal sealed class SmtpEmailSender(IOptions<EmailOptions> options) : IEmailSender
{
    private readonly EmailOptions _options = options.Value;

    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        var mime = new MimeMessage();
        mime.From.Add(new MailboxAddress(_options.FromName, _options.FromAddress));
        mime.To.Add(new MailboxAddress(message.ToName ?? message.ToAddress, message.ToAddress));
        mime.Subject = message.Subject;
        mime.Body = new BodyBuilder { HtmlBody = message.HtmlBody, TextBody = message.TextBody }.ToMessageBody();

        var smtp = _options.Smtp;
        using var client = new SmtpClient();
        var socketOptions = smtp.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.SslOnConnect;
        await client.ConnectAsync(smtp.Host, smtp.Port, socketOptions, cancellationToken);

        if (!string.IsNullOrEmpty(smtp.Username))
        {
            await client.AuthenticateAsync(smtp.Username, smtp.Password ?? string.Empty, cancellationToken);
        }

        await client.SendAsync(mime, cancellationToken);
        await client.DisconnectAsync(quit: true, cancellationToken);
    }
}
