import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DashboardView } from "@/features/dashboard/dashboard-view";
import type {
  DashboardItem,
  DashboardRequest,
} from "@/features/dashboard/types";

afterEach(cleanup);

const items: DashboardItem[] = [
  {
    id: "item-keyboards",
    name: "Wireless Keyboards",
    stock: 8,
  },
  {
    id: "item-cables",
    name: "USB-C Cables",
    stock: 2,
  },
  {
    id: "item-notebooks",
    name: "A5 Notebooks",
    stock: 0,
  },
];

const requests: DashboardRequest[] = [
  {
    id: "request-keyboards",
    requestedBy: "Maya Chen",
    quantity: 2,
    createdAt: "2026-09-15T14:00:00.000Z",
    item: items[0],
  },
  {
    id: "request-cables",
    requestedBy: "Theo Williams",
    quantity: 5,
    createdAt: "2026-09-16T15:30:00.000Z",
    item: items[1],
  },
];

function renderDashboard({
  inFlightRequestIds = {},
  mutationErrors = {},
  onFulfill = vi.fn(),
}: {
  inFlightRequestIds?: Record<string, true>;
  mutationErrors?: Record<string, string>;
  onFulfill?: (requestId: string) => void;
} = {}) {
  return render(
    <DashboardView
      items={items}
      requests={requests}
      inFlightRequestIds={inFlightRequestIds}
      mutationErrors={mutationErrors}
      onFulfill={onFulfill}
    />,
  );
}

describe("DashboardView", () => {
  it("summarizes inventory and clearly identifies low and blocked stock", () => {
    renderDashboard();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Inventory at a glance.",
      }),
    ).toBeInTheDocument();

    const unitsCard = screen.getByText("Units on hand").closest("article");
    const blockedCard = screen.getByText("Blocked requests").closest("article");

    expect(unitsCard).not.toBeNull();
    expect(blockedCard).not.toBeNull();
    expect(within(unitsCard!).getByText("10")).toBeInTheDocument();
    expect(within(blockedCard!).getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Low stock")).toBeInTheDocument();
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Needs 3 more units before this request can be fulfilled.",
      ),
    ).toBeInTheDocument();
  });

  it("emits fulfillment events and disables impossible requests", () => {
    const onFulfill = vi.fn();
    renderDashboard({ onFulfill });

    const fulfillButton = screen.getByRole("button", {
      name: "Fulfill request for Wireless Keyboards requested by Maya Chen",
    });
    const blockedButton = screen.getByRole("button", {
      name: "Cannot fulfill USB-C Cables request for Theo Williams",
    });

    fireEvent.click(fulfillButton);

    expect(onFulfill).toHaveBeenCalledOnce();
    expect(onFulfill).toHaveBeenCalledWith("request-keyboards");
    expect(blockedButton).toBeDisabled();
  });

  it("announces loading and prevents a duplicate fulfillment action", () => {
    const onFulfill = vi.fn();

    renderDashboard({
      inFlightRequestIds: { "request-keyboards": true },
      onFulfill,
    });

    const loadingButton = screen.getByRole("button", {
      name: "Fulfilling Wireless Keyboards request for Maya Chen",
    });

    expect(loadingButton).toBeDisabled();
    expect(loadingButton).toHaveAttribute("aria-busy", "true");
    fireEvent.click(loadingButton);
    expect(onFulfill).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "1 fulfillment is in progress.",
    );
  });

  it("shows request-scoped errors while leaving fulfillment available to retry", () => {
    const onFulfill = vi.fn();

    renderDashboard({
      mutationErrors: {
        "request-keyboards":
          "Inventory changed before fulfillment completed.",
      },
      onFulfill,
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Inventory changed before fulfillment completed. You can try again.",
    );

    const retryButton = screen.getByRole("button", {
      name: "Fulfill request for Wireless Keyboards requested by Maya Chen",
    });
    expect(retryButton).toBeEnabled();

    fireEvent.click(retryButton);
    expect(onFulfill).toHaveBeenCalledWith("request-keyboards");
  });
});
