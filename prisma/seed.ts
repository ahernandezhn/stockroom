import "dotenv/config";

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

import { PrismaClient } from "../src/generated/prisma/client";
import { RequestStatus } from "../src/generated/prisma/enums";

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

const items = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    name: "Wireless Keyboards",
    stock: 8,
    createdAt: new Date("2026-09-01T09:00:00.000Z"),
    updatedAt: new Date("2026-09-01T09:00:00.000Z"),
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    name: "USB-C Cables",
    stock: 2,
    createdAt: new Date("2026-09-01T09:05:00.000Z"),
    updatedAt: new Date("2026-09-01T09:05:00.000Z"),
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    name: "A5 Notebooks",
    stock: 0,
    createdAt: new Date("2026-09-01T09:10:00.000Z"),
    updatedAt: new Date("2026-09-01T09:10:00.000Z"),
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    name: "Ergonomic Mice",
    stock: 15,
    createdAt: new Date("2026-09-01T09:15:00.000Z"),
    updatedAt: new Date("2026-09-01T09:15:00.000Z"),
  },
] as const;

const requests = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    itemId: items[0].id,
    requestedBy: "Maya Chen",
    quantity: 2,
    status: RequestStatus.PENDING,
    fulfilledAt: null,
    createdAt: new Date("2026-09-15T14:00:00.000Z"),
    updatedAt: new Date("2026-09-15T14:00:00.000Z"),
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    itemId: items[1].id,
    requestedBy: "Theo Williams",
    quantity: 5,
    status: RequestStatus.PENDING,
    fulfilledAt: null,
    createdAt: new Date("2026-09-16T15:30:00.000Z"),
    updatedAt: new Date("2026-09-16T15:30:00.000Z"),
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    itemId: items[2].id,
    requestedBy: "Priya Shah",
    quantity: 1,
    status: RequestStatus.PENDING,
    fulfilledAt: null,
    createdAt: new Date("2026-09-17T10:15:00.000Z"),
    updatedAt: new Date("2026-09-17T10:15:00.000Z"),
  },
  {
    id: "20000000-0000-4000-8000-000000000004",
    itemId: items[3].id,
    requestedBy: "Jon Bell",
    quantity: 4,
    status: RequestStatus.PENDING,
    fulfilledAt: null,
    createdAt: new Date("2026-09-18T16:45:00.000Z"),
    updatedAt: new Date("2026-09-18T16:45:00.000Z"),
  },
  {
    id: "20000000-0000-4000-8000-000000000005",
    itemId: items[1].id,
    requestedBy: "Elena Garcia",
    quantity: 1,
    status: RequestStatus.FULFILLED,
    fulfilledAt: new Date("2026-09-12T11:30:00.000Z"),
    createdAt: new Date("2026-09-12T11:00:00.000Z"),
    updatedAt: new Date("2026-09-12T11:30:00.000Z"),
  },
] as const;

async function main() {
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.item.upsert({
        where: { id: item.id },
        create: item,
        update: item,
      });
    }

    for (const request of requests) {
      await tx.stockRequest.upsert({
        where: { id: request.id },
        create: request,
        update: request,
      });
    }
  });

  console.log(`Seeded ${items.length} items and ${requests.length} requests.`);
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
