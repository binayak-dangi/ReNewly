namespace Renewly.Application.Common.Interfaces;

/// <summary>Commits all changes tracked by repositories in the current request as one transaction.</summary>
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
