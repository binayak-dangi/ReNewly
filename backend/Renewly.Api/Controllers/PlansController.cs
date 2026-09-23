using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Renewly.Api.Contracts;
using Renewly.Application.Features.Plans;

namespace Renewly.Api.Controllers;

/// <summary>Renewly's own Free / Pro plans, shown on the Premium screen.</summary>
[AllowAnonymous]
[Route(ApiPrefix + "/plans")]
public sealed class PlansController(IPlanService plans) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<SubscriptionPlanDto>>>> List(CancellationToken cancellationToken) =>
        Success(await plans.ListAsync(cancellationToken));
}
