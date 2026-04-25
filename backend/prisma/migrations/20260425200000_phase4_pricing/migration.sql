-- AlterTable
ALTER TABLE "Order" ADD COLUMN "zone"               TEXT;
ALTER TABLE "Order" ADD COLUMN "chargeableWeight"   DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN "dimensions"         TEXT;
ALTER TABLE "Order" ADD COLUMN "baseRate"           DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN "weightCharge"       DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN "surcharge"          DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN "priorityMultiplier" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN "fuelSurcharge"      DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN "totalPrice"         DOUBLE PRECISION;
