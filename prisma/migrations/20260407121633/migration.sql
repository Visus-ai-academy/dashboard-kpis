/*
  Warnings:

  - A unique constraint covering the columns `[company_id,date,unit_id]` on the table `non_working_days` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('CLIENT', 'INACTIVE');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('QUALIFIED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "MaturityLevel" AS ENUM ('INITIAL', 'DEVELOPING', 'MATURE', 'CLOSING');

-- CreateEnum
CREATE TYPE "Temperature" AS ENUM ('COLD', 'WARM', 'HOT');

-- AlterEnum
ALTER TYPE "Periodicity" ADD VALUE 'NONE';

-- DropIndex
DROP INDEX "non_working_days_company_id_date_key";

-- AlterTable
ALTER TABLE "entries" ADD COLUMN     "client_id" TEXT,
ADD COLUMN     "maturity_level" "MaturityLevel",
ADD COLUMN     "scheduled_date" DATE,
ADD COLUMN     "temperature" "Temperature";

-- AlterTable
ALTER TABLE "kpis" ADD COLUMN     "unit_id" TEXT;

-- AlterTable
ALTER TABLE "non_working_days" ADD COLUMN     "unit_id" TEXT;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "client_id" TEXT,
ADD COLUMN     "expected_volume" INTEGER,
ADD COLUMN     "volume_unit" TEXT;

-- AlterTable
ALTER TABLE "sellers" ADD COLUMN     "password_hash" TEXT;

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "unit_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'CLIENT',
    "entry_date" DATE,
    "exit_date" DATE,
    "exit_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_entries" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "client_id" TEXT,
    "status" "LeadStatus" NOT NULL,
    "entry_date" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clients_company_id_idx" ON "clients"("company_id");

-- CreateIndex
CREATE INDEX "lead_entries_company_id_entry_date_idx" ON "lead_entries"("company_id", "entry_date");

-- CreateIndex
CREATE INDEX "entries_client_id_idx" ON "entries"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "non_working_days_company_id_date_unit_id_key" ON "non_working_days"("company_id", "date", "unit_id");

-- AddForeignKey
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_entries" ADD CONSTRAINT "lead_entries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_entries" ADD CONSTRAINT "lead_entries_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_entries" ADD CONSTRAINT "lead_entries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_working_days" ADD CONSTRAINT "non_working_days_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
