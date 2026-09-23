"use client";

import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";

import { useDashboardMutationStore } from "./dashboard-store";
import { DashboardView } from "./dashboard-view";
import type { DashboardData } from "./types";

const DEFAULT_FULFILLMENT_ERROR =
  "The request could not be fulfilled right now.";

function getFulfillmentErrorMessage(payload: unknown): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }

  return DEFAULT_FULFILLMENT_ERROR;
}

export function DashboardContainer({ items, requests }: DashboardData) {
  const router = useRouter();
  const inFlightRequestIds = useDashboardMutationStore(
    (state) => state.inFlightRequestIds,
  );
  const mutationErrors = useDashboardMutationStore(
    (state) => state.mutationErrors,
  );
  const beginFulfillment = useDashboardMutationStore(
    (state) => state.beginFulfillment,
  );
  const completeFulfillment = useDashboardMutationStore(
    (state) => state.completeFulfillment,
  );
  const failFulfillment = useDashboardMutationStore(
    (state) => state.failFulfillment,
  );

  useEffect(() => {
    const pendingRequestIds = new Set(requests.map((request) => request.id));

    for (const requestId of Object.keys(inFlightRequestIds)) {
      if (!pendingRequestIds.has(requestId)) {
        completeFulfillment(requestId);
      }
    }
  }, [completeFulfillment, inFlightRequestIds, requests]);

  async function handleFulfill(requestId: string) {
    if (inFlightRequestIds[requestId]) {
      return;
    }

    beginFulfillment(requestId);

    try {
      const response = await fetch(
        `/api/requests/${encodeURIComponent(requestId)}/fulfill`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
          },
        },
      );
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        failFulfillment(requestId, getFulfillmentErrorMessage(payload));
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      failFulfillment(requestId, DEFAULT_FULFILLMENT_ERROR);
    }
  }

  return (
    <DashboardView
      items={items}
      requests={requests}
      inFlightRequestIds={inFlightRequestIds}
      mutationErrors={mutationErrors}
      onFulfill={handleFulfill}
    />
  );
}
