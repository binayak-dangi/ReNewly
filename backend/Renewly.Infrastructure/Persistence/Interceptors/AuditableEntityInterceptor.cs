using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Renewly.Domain.Common;

namespace Renewly.Infrastructure.Persistence.Interceptors;

/// <summary>
/// Stamps created/updated timestamps and converts deletes of <see cref="ISoftDeletable"/>
/// entities into soft deletes, so services never have to remember either.
/// </summary>
internal sealed class AuditableEntityInterceptor(TimeProvider timeProvider) : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        Apply(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        Apply(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void Apply(DbContext? context)
    {
        if (context is null)
        {
            return;
        }

        var now = timeProvider.GetUtcNow().UtcDateTime;

        foreach (var entry in context.ChangeTracker.Entries())
        {
            if (entry is { State: EntityState.Deleted, Entity: ISoftDeletable softDeletable })
            {
                entry.State = EntityState.Modified;
                softDeletable.IsDeleted = true;
                softDeletable.DeletedAtUtc = now;
            }

            if (entry.Entity is not BaseEntity entity)
            {
                continue;
            }

            switch (entry.State)
            {
                case EntityState.Added:
                    if (entity.CreatedAtUtc == default)
                    {
                        entity.CreatedAtUtc = now;
                    }

                    break;
                case EntityState.Modified:
                    entity.UpdatedAtUtc = now;
                    break;
            }
        }
    }
}
