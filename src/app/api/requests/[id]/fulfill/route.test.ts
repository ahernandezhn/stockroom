import "dotenv/config";

import { randomUUID } from "node:crypto";

import { afterAll, afterEach, describe, expect, it } from "vitest";

import { RequestStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

import { POST } from "./route";

const createdItemIds = new Set<string>();
const createdRequestIds = new Set<string>();

type FixtureOptions = {
  stock?: number;
  quantity?: number;
  requestedBy?: string;
};

async function createFixture({
  stock = 8,
  quantity = 2,
  requestedBy = "API integration test",
}: FixtureOptions = {}) {
  const itemId = randomUUID();
  const requestId = randomUUID();

  createdItemIds.add(itemId);
  createdRequestIds.add(requestId);

  await db.item.create({
    data: {
      id: itemId,
      name: `test-item-${itemId}`,
      stock,
    },
  });

  await db.stockRequest.create({
    data: {
      id: requestId,
      itemId,
      requestedBy,
      quantity,
    },
  });

  return { itemId, requestId, stock, quantity };
}

async function postFulfill(requestId: string) {
  const response = await POST(
    new Request(
      `http://localhost/api/requests/${encodeURIComponent(requestId)}/fulfill`,
      { method: "POST" },
    ),
    { params: Promise.resolve({ id: requestId }) },
  );

  return {
    response,
    body: (await response.json()) as Record<string, unknown>,
  };
}

async function cleanupFixtures() {
  const requestIds = [...createdRequestIds];
  const itemIds = [...createdItemIds];

  if (requestIds.length > 0) {
    await db.stockRequest.deleteMany({
      where: { id: { in: requestIds } },
    });
  }

  if (itemIds.length > 0) {
    await db.item.deleteMany({
      where: { id: { in: itemIds } },
    });
  }

  createdRequestIds.clear();
  createdItemIds.clear();
}

afterEach(cleanupFixtures);

afterAll(async () => {
  await cleanupFixtures();
  await db.$disconnect();
});

describe("POST /api/requests/[id]/fulfill", () => {
  it("fulfills a pending request and persists the inventory decrement", async () => {
    const fixture = await createFixture({ stock: 8, quantity: 3 });

    const { response, body } = await postFulfill(fixture.requestId);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: {
        request: {
          id: fixture.requestId,
          itemId: fixture.itemId,
          quantity: 3,
          status: RequestStatus.FULFILLED,
          fulfilledAt: expect.any(String),
        },
        idempotent: false,
      },
    });

    const [item, request] = await Promise.all([
      db.item.findUniqueOrThrow({ where: { id: fixture.itemId } }),
      db.stockRequest.findUniqueOrThrow({
        where: { id: fixture.requestId },
      }),
    ]);

    expect(item.stock).toBe(5);
    expect(request.status).toBe(RequestStatus.FULFILLED);
    expect(request.fulfilledAt).not.toBeNull();
  });

  it("allows exact stock and persists zero without going negative", async () => {
    const fixture = await createFixture({ stock: 4, quantity: 4 });

    const { response, body } = await postFulfill(fixture.requestId);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      data: {
        request: {
          id: fixture.requestId,
          status: RequestStatus.FULFILLED,
        },
        idempotent: false,
      },
    });

    const item = await db.item.findUniqueOrThrow({
      where: { id: fixture.itemId },
    });
    expect(item.stock).toBe(0);
  });

  it("returns a conflict and rolls back the request claim when stock is insufficient", async () => {
    const fixture = await createFixture({ stock: 2, quantity: 5 });

    const { response, body } = await postFulfill(fixture.requestId);

    expect(response.status).toBe(409);
    expect(body).toEqual({
      error: {
        code: "INSUFFICIENT_STOCK",
        message: "There is not enough stock to fulfill this request.",
        details: {
          availableStock: 2,
          requestedQuantity: 5,
        },
      },
    });

    const [item, request] = await Promise.all([
      db.item.findUniqueOrThrow({ where: { id: fixture.itemId } }),
      db.stockRequest.findUniqueOrThrow({
        where: { id: fixture.requestId },
      }),
    ]);

    expect(item.stock).toBe(2);
    expect(request).toMatchObject({
      status: RequestStatus.PENDING,
      fulfilledAt: null,
    });
  });

  it("rejects a malformed request ID without changing database state", async () => {
    const fixture = await createFixture();

    const { response, body } = await postFulfill("not-a-uuid");

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "INVALID_REQUEST_ID",
        message: "The stock request ID must be a valid UUID.",
      },
    });

    const [item, request] = await Promise.all([
      db.item.findUniqueOrThrow({ where: { id: fixture.itemId } }),
      db.stockRequest.findUniqueOrThrow({
        where: { id: fixture.requestId },
      }),
    ]);
    expect(item.stock).toBe(fixture.stock);
    expect(request.status).toBe(RequestStatus.PENDING);
  });

  it("returns not found for a valid UUID that does not exist", async () => {
    const missingRequestId = randomUUID();

    const { response, body } = await postFulfill(missingRequestId);

    expect(response.status).toBe(404);
    expect(body).toEqual({
      error: {
        code: "REQUEST_NOT_FOUND",
        message: "Stock request not found.",
      },
    });
    expect(
      await db.stockRequest.count({ where: { id: missingRequestId } }),
    ).toBe(0);
  });

  it("treats sequential replay as idempotent and decrements stock once", async () => {
    const fixture = await createFixture({ stock: 9, quantity: 3 });

    const first = await postFulfill(fixture.requestId);
    const replay = await postFulfill(fixture.requestId);

    expect(first.response.status).toBe(200);
    expect(replay.response.status).toBe(200);
    expect(first.body).toMatchObject({
      data: { idempotent: false },
    });
    expect(replay.body).toMatchObject({
      data: { idempotent: true },
    });
    expect(replay.body).toMatchObject({
      data: {
        request: (
          first.body.data as {
            request: Record<string, unknown>;
          }
        ).request,
      },
    });

    const [item, request] = await Promise.all([
      db.item.findUniqueOrThrow({ where: { id: fixture.itemId } }),
      db.stockRequest.findUniqueOrThrow({
        where: { id: fixture.requestId },
      }),
    ]);
    expect(item.stock).toBe(6);
    expect(request.status).toBe(RequestStatus.FULFILLED);
  });

  it("makes two concurrent calls for one request succeed idempotently with one decrement", async () => {
    const fixture = await createFixture({ stock: 10, quantity: 4 });

    const results = await Promise.all([
      postFulfill(fixture.requestId),
      postFulfill(fixture.requestId),
    ]);

    expect(results.map(({ response }) => response.status)).toEqual([200, 200]);
    expect(
      results
        .map(({ body }) => {
          const data = body.data as { idempotent: boolean };
          return data.idempotent;
        })
        .sort(),
    ).toEqual([false, true]);

    const [item, request] = await Promise.all([
      db.item.findUniqueOrThrow({ where: { id: fixture.itemId } }),
      db.stockRequest.findUniqueOrThrow({
        where: { id: fixture.requestId },
      }),
    ]);
    expect(item.stock).toBe(6);
    expect(request.status).toBe(RequestStatus.FULFILLED);
    expect(request.fulfilledAt).not.toBeNull();
  });

  it("allows only one of two competing requests when stock can satisfy one", async () => {
    const itemId = randomUUID();
    const firstRequestId = randomUUID();
    const secondRequestId = randomUUID();

    createdItemIds.add(itemId);
    createdRequestIds.add(firstRequestId);
    createdRequestIds.add(secondRequestId);

    await db.item.create({
      data: {
        id: itemId,
        name: `test-item-${itemId}`,
        stock: 5,
        requests: {
          create: [
            {
              id: firstRequestId,
              requestedBy: "Concurrent requester A",
              quantity: 4,
            },
            {
              id: secondRequestId,
              requestedBy: "Concurrent requester B",
              quantity: 4,
            },
          ],
        },
      },
    });

    const results = await Promise.all([
      postFulfill(firstRequestId),
      postFulfill(secondRequestId),
    ]);

    expect(
      results.map(({ response }) => response.status).sort((a, b) => a - b),
    ).toEqual([200, 409]);

    const successful = results.find(({ response }) => response.status === 200);
    const conflicted = results.find(({ response }) => response.status === 409);
    expect(successful?.body).toMatchObject({
      data: { idempotent: false },
    });
    expect(conflicted?.body).toEqual({
      error: {
        code: "INSUFFICIENT_STOCK",
        message: "There is not enough stock to fulfill this request.",
        details: {
          availableStock: 1,
          requestedQuantity: 4,
        },
      },
    });

    const [item, requests] = await Promise.all([
      db.item.findUniqueOrThrow({ where: { id: itemId } }),
      db.stockRequest.findMany({
        where: { id: { in: [firstRequestId, secondRequestId] } },
        orderBy: { id: "asc" },
      }),
    ]);

    expect(item.stock).toBe(1);
    expect(
      requests.filter(
        (request) => request.status === RequestStatus.FULFILLED,
      ),
    ).toHaveLength(1);
    expect(
      requests.filter((request) => request.status === RequestStatus.PENDING),
    ).toHaveLength(1);
    expect(
      requests.find((request) => request.status === RequestStatus.PENDING),
    ).toMatchObject({ fulfilledAt: null });
  });
});

describe("database integrity constraints", () => {
  it("rejects negative item stock at the database boundary", async () => {
    const itemId = randomUUID();
    createdItemIds.add(itemId);

    await expect(
      db.item.create({
        data: {
          id: itemId,
          name: `test-item-${itemId}`,
          stock: -1,
        },
      }),
    ).rejects.toThrow();

    expect(await db.item.count({ where: { id: itemId } })).toBe(0);
  });

  it("rejects non-positive request quantities at the database boundary", async () => {
    const itemId = randomUUID();
    const requestId = randomUUID();
    createdItemIds.add(itemId);
    createdRequestIds.add(requestId);

    await db.item.create({
      data: {
        id: itemId,
        name: `test-item-${itemId}`,
        stock: 5,
      },
    });

    await expect(
      db.stockRequest.create({
        data: {
          id: requestId,
          itemId,
          requestedBy: "Constraint test",
          quantity: 0,
        },
      }),
    ).rejects.toThrow();

    expect(
      await db.stockRequest.count({ where: { id: requestId } }),
    ).toBe(0);
    expect(await db.item.count({ where: { id: itemId } })).toBe(1);
  });

  it("rejects request status and fulfillment timestamp mismatches", async () => {
    const itemId = randomUUID();
    const fulfilledWithoutTimestampId = randomUUID();
    const pendingWithTimestampId = randomUUID();
    createdItemIds.add(itemId);
    createdRequestIds.add(fulfilledWithoutTimestampId);
    createdRequestIds.add(pendingWithTimestampId);

    await db.item.create({
      data: {
        id: itemId,
        name: `test-item-${itemId}`,
        stock: 5,
      },
    });

    await expect(
      db.stockRequest.create({
        data: {
          id: fulfilledWithoutTimestampId,
          itemId,
          requestedBy: "Constraint test",
          quantity: 1,
          status: RequestStatus.FULFILLED,
          fulfilledAt: null,
        },
      }),
    ).rejects.toThrow();

    await expect(
      db.stockRequest.create({
        data: {
          id: pendingWithTimestampId,
          itemId,
          requestedBy: "Constraint test",
          quantity: 1,
          status: RequestStatus.PENDING,
          fulfilledAt: new Date(),
        },
      }),
    ).rejects.toThrow();

    expect(
      await db.stockRequest.count({
        where: {
          id: {
            in: [fulfilledWithoutTimestampId, pendingWithTimestampId],
          },
        },
      }),
    ).toBe(0);
  });

  it("restricts deleting an item that still has requests", async () => {
    const fixture = await createFixture();

    await expect(
      db.item.delete({ where: { id: fixture.itemId } }),
    ).rejects.toThrow();

    expect(await db.item.count({ where: { id: fixture.itemId } })).toBe(1);
    expect(
      await db.stockRequest.count({ where: { id: fixture.requestId } }),
    ).toBe(1);
  });
});
