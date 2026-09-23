import { create } from "zustand";

type DashboardMutationState = {
  inFlightRequestIds: Record<string, true>;
  mutationErrors: Record<string, string>;
  beginFulfillment: (requestId: string) => void;
  completeFulfillment: (requestId: string) => void;
  failFulfillment: (requestId: string, message: string) => void;
};

export const useDashboardMutationStore = create<DashboardMutationState>(
  (set) => ({
    inFlightRequestIds: {},
    mutationErrors: {},
    beginFulfillment: (requestId) =>
      set((state) => {
        const mutationErrors = { ...state.mutationErrors };
        delete mutationErrors[requestId];

        return {
          inFlightRequestIds: {
            ...state.inFlightRequestIds,
            [requestId]: true,
          },
          mutationErrors,
        };
      }),
    completeFulfillment: (requestId) =>
      set((state) => {
        const inFlightRequestIds = { ...state.inFlightRequestIds };
        const mutationErrors = { ...state.mutationErrors };
        delete inFlightRequestIds[requestId];
        delete mutationErrors[requestId];

        return { inFlightRequestIds, mutationErrors };
      }),
    failFulfillment: (requestId, message) =>
      set((state) => {
        const inFlightRequestIds = { ...state.inFlightRequestIds };
        delete inFlightRequestIds[requestId];

        return {
          inFlightRequestIds,
          mutationErrors: {
            ...state.mutationErrors,
            [requestId]: message,
          },
        };
      }),
  }),
);
