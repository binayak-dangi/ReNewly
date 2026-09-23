using Renewly.Application.Common.Exceptions;
using Renewly.Domain.Enums;

namespace Renewly.Application.Features.Catalog;

public interface ICatalogService
{
    Task<IReadOnlyList<SubscriptionServiceDto>> ListAsync(
        string? search,
        SubscriptionCategory? category,
        CancellationToken cancellationToken = default);

    Task<SubscriptionServiceDto> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<CancellationGuideDto> GetCancellationGuideAsync(Guid id, CancellationToken cancellationToken = default);
}

internal sealed class CatalogService(ISubscriptionServiceRepository services) : ICatalogService
{
    public async Task<IReadOnlyList<SubscriptionServiceDto>> ListAsync(
        string? search,
        SubscriptionCategory? category,
        CancellationToken cancellationToken = default)
    {
        var items = await services.ListActiveAsync(search?.Trim(), category, cancellationToken);
        return items.Select(SubscriptionServiceDto.From).ToList();
    }

    public async Task<SubscriptionServiceDto> GetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var service = await services.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Service", id);
        return SubscriptionServiceDto.From(service);
    }

    public async Task<CancellationGuideDto> GetCancellationGuideAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var service = await services.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Service", id);
        return CancellationGuideDto.From(service);
    }
}
