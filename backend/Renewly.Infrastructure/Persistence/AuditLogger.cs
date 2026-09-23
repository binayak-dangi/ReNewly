using Renewly.Application.Common.Interfaces;
using Renewly.Domain.Entities;

namespace Renewly.Infrastructure.Persistence;

internal sealed class AuditLogger(RenewlyDbContext db, ICurrentUser currentUser, TimeProvider timeProvider) : IAuditLogger
{
    public void Log(string action, Guid? userId, string? entityName = null, string? entityId = null, string? details = null)
    {
        db.AuditLogs.Add(new AuditLog
        {
            Action = action,
            UserId = userId ?? currentUser.UserId,
            EntityName = entityName,
            EntityId = entityId,
            Details = details,
            IpAddress = currentUser.IpAddress,
            UserAgent = Truncate(currentUser.UserAgent, 512),
            CreatedAtUtc = timeProvider.GetUtcNow().UtcDateTime,
        });
    }

    private static string? Truncate(string? value, int max) =>
        value is { Length: > 0 } && value.Length > max ? value[..max] : value;
}
