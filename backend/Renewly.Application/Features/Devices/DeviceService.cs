using FluentValidation;
using Renewly.Application.Common.Interfaces;
using Renewly.Domain.Entities;
using Renewly.Domain.Enums;

namespace Renewly.Application.Features.Devices;

public sealed record RegisterDeviceRequest(string FcmToken, DevicePlatform Platform, string? DeviceName, string? AppVersion);

public sealed record UnregisterDeviceRequest(string FcmToken);

internal sealed class RegisterDeviceRequestValidator : AbstractValidator<RegisterDeviceRequest>
{
    public RegisterDeviceRequestValidator()
    {
        RuleFor(x => x.FcmToken).NotEmpty().MaximumLength(512);
        RuleFor(x => x.Platform).IsInEnum();
        RuleFor(x => x.DeviceName).MaximumLength(100);
        RuleFor(x => x.AppVersion).MaximumLength(32);
    }
}

internal sealed class UnregisterDeviceRequestValidator : AbstractValidator<UnregisterDeviceRequest>
{
    public UnregisterDeviceRequestValidator() => RuleFor(x => x.FcmToken).NotEmpty().MaximumLength(512);
}

public interface IUserDeviceRepository : IRepository<UserDevice>
{
    /// <summary>Looks up a token regardless of owner (a device can change hands on re-login).</summary>
    Task<UserDevice?> GetByTokenAsync(string fcmToken, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<UserDevice>> ListActiveForUserAsync(Guid userId, CancellationToken cancellationToken = default);
}

public interface IDeviceService
{
    Task RegisterAsync(RegisterDeviceRequest request, CancellationToken cancellationToken = default);

    Task UnregisterAsync(UnregisterDeviceRequest request, CancellationToken cancellationToken = default);
}

internal sealed class DeviceService(
    IUserDeviceRepository devices,
    IUnitOfWork unitOfWork,
    ICurrentUser currentUser,
    TimeProvider timeProvider) : IDeviceService
{
    public async Task RegisterAsync(RegisterDeviceRequest request, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequiredUserId;
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var device = await devices.GetByTokenAsync(request.FcmToken, cancellationToken);

        if (device is null)
        {
            devices.Add(new UserDevice
            {
                UserId = userId,
                FcmToken = request.FcmToken,
                Platform = request.Platform,
                DeviceName = request.DeviceName,
                AppVersion = request.AppVersion,
                LastSeenAtUtc = now,
            });
        }
        else
        {
            // Same install, possibly a different account now: push must follow the signed-in user.
            device.UserId = userId;
            device.Platform = request.Platform;
            device.DeviceName = request.DeviceName;
            device.AppVersion = request.AppVersion;
            device.IsActive = true;
            device.LastSeenAtUtc = now;
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task UnregisterAsync(UnregisterDeviceRequest request, CancellationToken cancellationToken = default)
    {
        var device = await devices.GetByTokenAsync(request.FcmToken, cancellationToken);
        if (device is null || device.UserId != currentUser.RequiredUserId)
        {
            return; // Idempotent; never reveal other users' devices.
        }

        devices.Remove(device);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
