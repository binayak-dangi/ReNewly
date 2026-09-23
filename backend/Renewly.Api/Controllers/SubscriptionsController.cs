using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Renewly.Api.Contracts;
using Renewly.Api.Infrastructure;
using Renewly.Application.Features.Catalog;
using Renewly.Application.Features.Subscriptions;

namespace Renewly.Api.Controllers;

[Authorize(Policy = SecuritySetup.VerifiedEmailPolicy)]
[Route(ApiPrefix + "/subscriptions")]
public sealed class SubscriptionsController(IUserSubscriptionService subscriptions) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<SubscriptionDto>>>> List(
        [FromQuery] SubscriptionListQuery query,
        CancellationToken cancellationToken) =>
        Success(await subscriptions.ListAsync(query, cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<SubscriptionDetailDto>>> Get(Guid id, CancellationToken cancellationToken) =>
        Success(await subscriptions.GetAsync(id, cancellationToken));

    [HttpPost]
    public async Task<ActionResult<ApiResponse<SubscriptionDetailDto>>> Create(SaveSubscriptionRequest request, CancellationToken cancellationToken)
    {
        var created = await subscriptions.CreateAsync(request, cancellationToken);
        return Created($"/{ApiPrefix}/subscriptions/{created.Subscription.Id}", created, "Subscription added.");
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<SubscriptionDetailDto>>> Update(Guid id, SaveSubscriptionRequest request, CancellationToken cancellationToken) =>
        Success(await subscriptions.UpdateAsync(id, request, cancellationToken), "Subscription updated.");

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        await subscriptions.DeleteAsync(id, cancellationToken);
        return Success("Subscription deleted.");
    }

    /// <summary>Records that the user has cancelled with the provider. Renewly cannot cancel third-party subscriptions.</summary>
    [HttpPost("{id:guid}/mark-cancelled")]
    public async Task<ActionResult<ApiResponse<SubscriptionDetailDto>>> MarkCancelled(Guid id, CancellationToken cancellationToken) =>
        Success(await subscriptions.MarkCancelledAsync(id, cancellationToken), "Marked as cancelled. Reminders are turned off.");

    [HttpPost("{id:guid}/reactivate")]
    public async Task<ActionResult<ApiResponse<SubscriptionDetailDto>>> Reactivate(Guid id, CancellationToken cancellationToken) =>
        Success(await subscriptions.ReactivateAsync(id, cancellationToken), "Subscription reactivated.");

    [HttpGet("{id:guid}/cancellation-guide")]
    public async Task<ActionResult<ApiResponse<CancellationGuideDto>>> CancellationGuide(Guid id, CancellationToken cancellationToken) =>
        Success(await subscriptions.GetCancellationGuideAsync(id, cancellationToken));
}
