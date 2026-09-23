using Microsoft.EntityFrameworkCore;
using Renewly.Application.Common.Interfaces;
using Renewly.Domain.Common;

namespace Renewly.Infrastructure.Persistence.Repositories;

internal abstract class Repository<TEntity>(RenewlyDbContext db) : IRepository<TEntity>
    where TEntity : BaseEntity
{
    protected RenewlyDbContext Db { get; } = db;

    protected DbSet<TEntity> Set => Db.Set<TEntity>();

    public virtual Task<TEntity?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        Set.FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

    public void Add(TEntity entity) => Set.Add(entity);

    public void Remove(TEntity entity) => Set.Remove(entity);
}
