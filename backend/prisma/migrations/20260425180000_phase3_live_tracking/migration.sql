-- AlterTable
ALTER TABLE "Order" ADD COLUMN "agentToken" TEXT;
ALTER TABLE "Order" ADD COLUMN "agentLat" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN "agentLng" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN "agentLastSeen" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "deliveredAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Order_agentToken_key" ON "Order"("agentToken");
