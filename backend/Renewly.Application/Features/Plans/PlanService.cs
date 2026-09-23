using Renewly.Application.Common.Interfaces;
using Renewly.Domain.Entities;

namespace Renewly.Application.Features.Plans;

public interface ISubscriptionPlanRepository : IRepository<SubscriptionPlan>
{
    Task<IReadOnlyList<SubscriptionPlan>> ListActiveAsync(CancellationToken cancellationToken = default);

    Task<SubscriptionPlan?> GetByCodeAsync(string code, CancellationToken cancellationToken = default);
}

public interface IPlanService
{
    Task<IReadOnlyList<SubscriptionPlanDto>> ListAsync(CancellationToken cancellationToken = default);
}

internal sealed class PlanService(ISubscriptionPlanRepository plans) : IPlanService
{
    public async Task<IReadOnlyList<SubscriptionPlanDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        var items = await plans.ListActiveAsync(cancellationToken);
        return items.Select(SubscriptionPlanDto.From).ToList();
    }
}
