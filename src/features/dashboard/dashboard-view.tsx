import type { ReactNode, SVGProps } from "react";

import type { DashboardItem, DashboardRequest } from "./types";

const LOW_STOCK_THRESHOLD = 5;

type DashboardViewProps = {
  items: DashboardItem[];
  requests: DashboardRequest[];
  inFlightRequestIds: Record<string, true>;
  mutationErrors: Record<string, string>;
  onFulfill: (requestId: string) => void;
};

type IconProps = SVGProps<SVGSVGElement>;

const requestDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

function BoxesIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
      {...props}
    >
      <path d="m12 3 7 4-7 4-7-4 7-4Z" />
      <path d="m5 7v8l7 4 7-4V7M12 11v8" />
    </svg>
  );
}

function ClipboardIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
      {...props}
    >
      <path d="M9 5h6M9 3h6v4H9z" />
      <path d="M7 5H5v16h14V5h-2M8 12h8M8 16h5" />
    </svg>
  );
}

function AlertIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3 2.8 20h18.4L12 3Z" />
      <path d="M12 9v5M12 17.5v.5" />
    </svg>
  );
}

function CheckIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      {...props}
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function ArrowIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      {...props}
    >
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}

function SpinnerIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity=".25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
  tone = "slate",
}: {
  label: string;
  value: number;
  detail: string;
  icon: ReactNode;
  tone?: "slate" | "amber" | "rose" | "teal";
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
    teal: "bg-teal-100 text-teal-700",
  };

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${tones[tone]}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

function InventoryStatus({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
        <span className="size-1.5 rounded-full bg-rose-500" />
        Out of stock
      </span>
    );
  }

  if (stock <= LOW_STOCK_THRESHOLD) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        <span className="size-1.5 rounded-full bg-amber-500" />
        Low stock
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
      <span className="size-1.5 rounded-full bg-teal-500" />
      In stock
    </span>
  );
}

function InventoryPanel({ items }: { items: DashboardItem[] }) {
  const largestStock = Math.max(...items.map((item) => item.stock), 1);

  return (
    <section
      className="rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]"
      aria-labelledby="inventory-heading"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
            Inventory
          </p>
          <h2
            id="inventory-heading"
            className="mt-1 text-xl font-semibold tracking-tight text-slate-950"
          >
            Current stock
          </h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <BoxesIcon className="mx-auto size-9 text-slate-300" />
          <p className="mt-3 font-medium text-slate-700">No inventory yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Stock items will appear here when they are available.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => {
            const stockWidth = Math.max(
              item.stock === 0 ? 0 : 8,
              Math.round((item.stock / largestStock) * 100),
            );

            return (
              <li key={item.id} className="px-5 py-5 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {item.name}
                    </p>
                    <div className="mt-2">
                      <InventoryStatus stock={item.stock} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-semibold tracking-tight text-slate-950">
                      {item.stock}
                    </p>
                    <p className="text-xs text-slate-500">units</p>
                  </div>
                </div>
                <div
                  className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"
                  aria-hidden="true"
                >
                  <div
                    className={`h-full rounded-full ${
                      item.stock === 0
                        ? "bg-rose-500"
                        : item.stock <= LOW_STOCK_THRESHOLD
                          ? "bg-amber-500"
                          : "bg-teal-500"
                    }`}
                    style={{ width: `${stockWidth}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function RequestPanel({
  requests,
  inFlightRequestIds,
  mutationErrors,
  onFulfill,
}: Pick<
  DashboardViewProps,
  | "requests"
  | "inFlightRequestIds"
  | "mutationErrors"
  | "onFulfill"
>) {
  return (
    <section
      className="rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]"
      aria-labelledby="requests-heading"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
            Requests
          </p>
          <h2
            id="requests-heading"
            className="mt-1 text-xl font-semibold tracking-tight text-slate-950"
          >
            Pending fulfillment
          </h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {requests.length} pending
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-teal-50 text-teal-700">
            <CheckIcon className="size-6" />
          </span>
          <p className="mt-3 font-medium text-slate-700">
            All requests are fulfilled
          </p>
          <p className="mt-1 text-sm text-slate-500">
            New pending requests will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {requests.map((request) => {
            const isBlocked = request.item.stock < request.quantity;
            const isInFlight = Boolean(inFlightRequestIds[request.id]);
            const error = mutationErrors[request.id];
            const statusId = `request-status-${request.id}`;
            const errorId = `request-error-${request.id}`;
            const unitsShort = request.quantity - request.item.stock;

            return (
              <li key={request.id} className="px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-950">
                        {request.item.name}
                      </h3>
                      {isBlocked && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                          <AlertIcon className="size-3.5" />
                          Blocked
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      <span className="font-medium text-slate-800">
                        {request.requestedBy}
                      </span>{" "}
                      requested {request.quantity}{" "}
                      {request.quantity === 1 ? "unit" : "units"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {requestDateFormatter.format(
                        new Date(request.createdAt),
                      )}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Available
                      </p>
                      <p
                        className={`mt-0.5 text-lg font-semibold ${
                          isBlocked ? "text-rose-700" : "text-slate-900"
                        }`}
                      >
                        {request.item.stock}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isBlocked || isInFlight}
                      aria-busy={isInFlight}
                      aria-describedby={
                        [isBlocked ? statusId : null, error ? errorId : null]
                          .filter(Boolean)
                          .join(" ") || undefined
                      }
                      aria-label={
                        isBlocked
                          ? `Cannot fulfill ${request.item.name} request for ${request.requestedBy}`
                          : isInFlight
                            ? `Fulfilling ${request.item.name} request for ${request.requestedBy}`
                            : `Fulfill request for ${request.item.name} requested by ${request.requestedBy}`
                      }
                      className="inline-flex min-w-28 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                      onClick={() => onFulfill(request.id)}
                    >
                      {isBlocked ? (
                        "Blocked"
                      ) : isInFlight ? (
                        <>
                          <SpinnerIcon className="size-4 animate-spin" />
                          Fulfilling…
                        </>
                      ) : (
                        <>
                          Fulfill
                          <ArrowIcon className="size-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {isBlocked && (
                  <p
                    id={statusId}
                    className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
                  >
                    Needs {unitsShort} more{" "}
                    {unitsShort === 1 ? "unit" : "units"} before this request
                    can be fulfilled.
                  </p>
                )}
                {error && (
                  <p
                    id={errorId}
                    role="alert"
                    className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
                  >
                    {error} You can try again.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function DashboardView({
  items,
  requests,
  inFlightRequestIds,
  mutationErrors,
  onFulfill,
}: DashboardViewProps) {
  const totalUnits = items.reduce((total, item) => total + item.stock, 0);
  const attentionItems = items.filter(
    (item) => item.stock <= LOW_STOCK_THRESHOLD,
  ).length;
  const blockedRequests = requests.filter(
    (request) => request.item.stock < request.quantity,
  ).length;
  const activeFulfillments = Object.keys(inFlightRequestIds).length;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        <div
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
          role="status"
        >
          {activeFulfillments > 0
            ? `${activeFulfillments} fulfillment ${
                activeFulfillments === 1 ? "is" : "are"
              } in progress.`
            : ""}
        </div>

        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-slate-950 text-white shadow-sm">
                <BoxesIcon className="size-6" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
                  Stockroom
                </p>
                <p className="text-sm text-slate-500">Operations workspace</p>
              </div>
            </div>
            <h1 className="mt-7 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">
              Inventory at a glance.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Review live stock levels and fulfill pending team requests from
              one clear workspace.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-teal-400 opacity-50" />
              <span className="relative inline-flex size-2 rounded-full bg-teal-500" />
            </span>
            Server-backed inventory
          </div>
        </header>

        <section
          className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Stockroom summary"
        >
          <SummaryCard
            label="Units on hand"
            value={totalUnits}
            detail={`Across ${items.length} inventory ${
              items.length === 1 ? "item" : "items"
            }`}
            icon={<BoxesIcon className="size-5" />}
          />
          <SummaryCard
            label="Pending requests"
            value={requests.length}
            detail="Awaiting stockroom review"
            icon={<ClipboardIcon className="size-5" />}
            tone="teal"
          />
          <SummaryCard
            label="Attention items"
            value={attentionItems}
            detail={`At or below ${LOW_STOCK_THRESHOLD} units`}
            icon={<AlertIcon className="size-5" />}
            tone="amber"
          />
          <SummaryCard
            label="Blocked requests"
            value={blockedRequests}
            detail="Waiting for additional stock"
            icon={<AlertIcon className="size-5" />}
            tone="rose"
          />
        </section>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.4fr)]">
          <InventoryPanel items={items} />
          <RequestPanel
            requests={requests}
            inFlightRequestIds={inFlightRequestIds}
            mutationErrors={mutationErrors}
            onFulfill={onFulfill}
          />
        </div>
      </div>
    </main>
  );
}
