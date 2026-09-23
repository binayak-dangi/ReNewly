using Renewly.Application.Common.Interfaces;
using Renewly.Domain.Entities;
using Renewly.Domain.Enums;

namespace Renewly.Application.Features.Catalog;

public interface ISubscriptionServiceRepository : IRepository<SubscriptionService>
{
    Task<IReadOnlyList<SubscriptionService>> ListActiveAsync(
        string? search,
        SubscriptionCategory? category,
        CancellationToken cancellationToken = default);

    Task<SubscriptionService?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);
}
