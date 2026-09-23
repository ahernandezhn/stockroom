import { connection } from "next/server";

import { DashboardContainer } from "@/features/dashboard/dashboard-container";
import { RequestStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

export default async function HomePage() {
  await connection();

  const [items, requests] = await Promise.all([
    db.item.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        stock: true,
      },
    }),
    db.stockRequest.findMany({
      where: {
        status: RequestStatus.PENDING,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        requestedBy: true,
        quantity: true,
        createdAt: true,
        item: {
          select: {
            id: true,
            name: true,
            stock: true,
          },
        },
      },
    }),
  ]);

  return (
    <DashboardContainer
      items={items}
      requests={requests.map((request) => ({
        ...request,
        createdAt: request.createdAt.toISOString(),
      }))}
    />
  );
}
