/*
  Warnings:

  - The values [CLOSED] on the enum `ContactStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ContactStatus_new" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED');
ALTER TABLE "contacts" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "contacts" ALTER COLUMN "status" TYPE "ContactStatus_new" USING ("status"::text::"ContactStatus_new");
ALTER TYPE "ContactStatus" RENAME TO "ContactStatus_old";
ALTER TYPE "ContactStatus_new" RENAME TO "ContactStatus";
DROP TYPE "ContactStatus_old";
ALTER TABLE "contacts" ALTER COLUMN "status" SET DEFAULT 'NEW';
COMMIT;

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "tenantid" TEXT NOT NULL,
    "ingredientid" TEXT NOT NULL,
    "type" "InventoryAdjustmentType" NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "createdbyid" TEXT NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_ingredientid_fkey" FOREIGN KEY ("ingredientid") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_createdbyid_fkey" FOREIGN KEY ("createdbyid") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_tenantid_fkey" FOREIGN KEY ("tenantid") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
