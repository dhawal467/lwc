import { useQuery } from '@tanstack/react-query';

interface DashboardStats {
  activeOrders: number;
  overdueOrders: number;
  totalOutstanding: number;
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      return response.json();
    },
  });
}
