import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: dashboardApi.get,
    // "Renews in N days" changes daily; refresh whenever the user comes back to the app.
    staleTime: 60_000,
  });
}
