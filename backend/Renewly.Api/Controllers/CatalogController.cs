using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Renewly.Api.Contracts;
using Renewly.Application.Features.Catalog;
using Renewly.Domain.Enums;

namespace Renewly.Api.Controllers;

/// <summary>Catalog of well-known services used to pre-fill the "Add subscription" form.</summary>
[AllowAnonymous]
[Route(ApiPrefix + "/services")]
public sealed class CatalogController(ICatalogService catalog) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<SubscriptionServiceDto>>>> List(
        [FromQuery] string? search,
        [FromQuery] SubscriptionCategory? category,
        CancellationToken cancellationToken) =>
        Success(await catalog.ListAsync(search, category, cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<SubscriptionServiceDto>>> Get(Guid id, CancellationToken cancellationToken) =>
        Success(await catalog.GetAsync(id, cancellationToken));

    [HttpGet("{id:guid}/cancellation-guide")]
    public async Task<ActionResult<ApiResponse<CancellationGuideDto>>> GetCancellationGuide(Guid id, CancellationToken cancellationToken) =>
        Success(await catalog.GetCancellationGuideAsync(id, cancellationToken));
}
