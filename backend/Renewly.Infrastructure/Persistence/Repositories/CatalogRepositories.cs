using Microsoft.EntityFrameworkCore;
using Renewly.Application.Features.Catalog;
using Renewly.Application.Features.Plans;
using Renewly.Domain.Entities;
using Renewly.Domain.Enums;

namespace Renewly.Infrastructure.Persistence.Repositories;

internal sealed class SubscriptionServiceRepository(RenewlyDbContext db)
    : Repository<SubscriptionService>(db), ISubscriptionServiceRepository
{
    public async Task<IReadOnlyList<SubscriptionService>> ListActiveAsync(
        string? search,
        SubscriptionCategory? category,
        CancellationToken cancellationToken = default)
    {
        var query = Set.AsNoTracking().Where(s => s.IsActive);

        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(s => s.Name.Contains(search));
        }

        if (category is not null)
        {
            query = query.Where(s => s.Category == category);
        }

        return await query.OrderBy(s => s.SortOrder).ThenBy(s => s.Name).ToListAsync(cancellationToken);
    }

    public Task<SubscriptionService?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default) =>
        Set.FirstOrDefaultAsync(s => s.Slug == slug, cancellationToken);
}

internal sealed class SubscriptionPlanRepository(RenewlyDbContext db)
    : Repository<SubscriptionPlan>(db), ISubscriptionPlanRepository
{
    public async Task<IReadOnlyList<SubscriptionPlan>> ListActiveAsync(CancellationToken cancellationToken = default) =>
        await Set.AsNoTracking().Where(p => p.IsActive).OrderBy(p => p.SortOrder).ToListAsync(cancellationToken);

    public Task<SubscriptionPlan?> GetByCodeAsync(string code, CancellationToken cancellationToken = default) =>
        Set.FirstOrDefaultAsync(p => p.Code == code, cancellationToken);
}
