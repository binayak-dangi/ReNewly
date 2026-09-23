using Renewly.Domain.Common;

namespace Renewly.Application.Common.Interfaces;

/// <summary>
/// Minimal write-side repository. Feature repositories extend this with purpose-built queries
/// rather than exposing IQueryable, keeping EF Core out of the Application layer.
/// </summary>
public interface IRepository<TEntity>
    where TEntity : BaseEntity
{
    Task<TEntity?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    void Add(TEntity entity);

    void Remove(TEntity entity);
}
