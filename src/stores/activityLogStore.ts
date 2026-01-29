import { create } from 'zustand';
import { ActivityLog } from '@/types';

interface ActivityLogState {
  logs: ActivityLog[];
  loading: boolean;
  fetchLogs: () => Promise<void>;
}

export const useActivityLogStore = create<ActivityLogState>((set) => ({
  logs: [],
  loading: false,

  fetchLogs: async () => {
    set({ loading: true });
    try {
      // TODO: Implement API call
      set({ logs: [] });
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      set({ loading: false });
    }
  },
}));
