-- CreateTable
CREATE TABLE "Hub" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parentId" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Hub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryAgent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "vehicle" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "hubId" TEXT NOT NULL,

    CONSTRAINT "DeliveryAgent_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "agentId" TEXT;
ALTER TABLE "Order" ADD COLUMN "assignedHubId" TEXT;
ALTER TABLE "Order" ADD COLUMN "isUrban" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "DeliveryAgent" ADD CONSTRAINT "DeliveryAgent_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "Hub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "DeliveryAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedHubId_fkey" FOREIGN KEY ("assignedHubId") REFERENCES "Hub"("id") ON DELETE SET NULL ON UPDATE CASCADE;
