-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'FULFILLED');

-- CreateTable
CREATE TABLE "Item" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "stock" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Item_stock_nonnegative" CHECK ("stock" >= 0)
);

-- CreateTable
CREATE TABLE "StockRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "itemId" UUID NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "fulfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StockRequest_quantity_positive" CHECK ("quantity" > 0),
    CONSTRAINT "StockRequest_status_fulfilled_at_consistent" CHECK (
        ("status" = 'PENDING' AND "fulfilledAt" IS NULL)
        OR
        ("status" = 'FULFILLED' AND "fulfilledAt" IS NOT NULL)
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_name_key" ON "Item"("name");

-- CreateIndex
CREATE INDEX "StockRequest_status_createdAt_idx" ON "StockRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StockRequest_itemId_status_idx" ON "StockRequest"("itemId", "status");

-- AddForeignKey
ALTER TABLE "StockRequest"
ADD CONSTRAINT "StockRequest_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "Item"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
