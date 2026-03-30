-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'VIEWER');

-- CreateEnum
CREATE TYPE "KpiType" AS ENUM ('NUMERIC', 'MONETARY', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "Periodicity" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "KpiScope" AS ENUM ('COMPANY', 'SPECIFIC_SELLERS');

-- CreateEnum
CREATE TYPE "ChartType" AS ENUM ('LINE', 'BAR', 'AREA', 'PIE', 'RADIAL', 'STACKED_BAR');

-- CreateEnum
CREATE TYPE "SeasonType" AS ENUM ('WEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RuleType" AS ENUM ('POINTS_PER_UNIT', 'BONUS_THRESHOLD', 'MULTIPLIER');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MANAGER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sectors" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "sector_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sellers" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "team_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "access_code" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpis" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "KpiType" NOT NULL DEFAULT 'NUMERIC',
    "periodicity" "Periodicity" NOT NULL DEFAULT 'DAILY',
    "target_value" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "is_individual" BOOLEAN NOT NULL DEFAULT true,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "scope" "KpiScope" NOT NULL DEFAULT 'COMPANY',
    "chart_type" "ChartType" NOT NULL DEFAULT 'LINE',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_sectors" (
    "id" TEXT NOT NULL,
    "kpi_id" TEXT NOT NULL,
    "sector_id" TEXT NOT NULL,

    CONSTRAINT "kpi_sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_sellers" (
    "id" TEXT NOT NULL,
    "kpi_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "custom_target" DECIMAL(65,30),

    CONSTRAINT "kpi_sellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_targets" (
    "id" TEXT NOT NULL,
    "kpi_id" TEXT NOT NULL,
    "seller_id" TEXT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "target_value" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "monthly_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entries" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "kpi_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "entry_date" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entry_schedules" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "kpi_id" TEXT NOT NULL,
    "frequency" "Periodicity" NOT NULL,
    "deadline_time" TEXT,
    "reminder_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entry_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "non_working_days" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "include_saturday" BOOLEAN NOT NULL DEFAULT false,
    "include_sunday" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "non_working_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "gamification_enabled" BOOLEAN NOT NULL DEFAULT true,
    "season_type" "SeasonType" NOT NULL DEFAULT 'MONTHLY',
    "reset_points_on_end" BOOLEAN NOT NULL DEFAULT false,
    "team_mode" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoring_rules" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rule_type" "RuleType" NOT NULL DEFAULT 'POINTS_PER_UNIT',
    "kpi_id" TEXT,
    "points_per_unit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "max_points_per_day" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "max_points_per_week" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scoring_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_participants" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamification_levels" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "min_points" DECIMAL(65,30) NOT NULL,
    "badge_emoji" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "gamification_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_points" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "total_points" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "sale_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "users"("company_id");

-- CreateIndex
CREATE INDEX "units_company_id_idx" ON "units"("company_id");

-- CreateIndex
CREATE INDEX "sectors_company_id_idx" ON "sectors"("company_id");

-- CreateIndex
CREATE INDEX "sectors_unit_id_idx" ON "sectors"("unit_id");

-- CreateIndex
CREATE INDEX "teams_company_id_idx" ON "teams"("company_id");

-- CreateIndex
CREATE INDEX "teams_sector_id_idx" ON "teams"("sector_id");

-- CreateIndex
CREATE UNIQUE INDEX "sellers_access_code_key" ON "sellers"("access_code");

-- CreateIndex
CREATE UNIQUE INDEX "sellers_access_token_key" ON "sellers"("access_token");

-- CreateIndex
CREATE INDEX "sellers_company_id_idx" ON "sellers"("company_id");

-- CreateIndex
CREATE INDEX "sellers_team_id_idx" ON "sellers"("team_id");

-- CreateIndex
CREATE INDEX "kpis_company_id_idx" ON "kpis"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_sectors_kpi_id_sector_id_key" ON "kpi_sectors"("kpi_id", "sector_id");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_sellers_kpi_id_seller_id_key" ON "kpi_sellers"("kpi_id", "seller_id");

-- CreateIndex
CREATE INDEX "monthly_targets_kpi_id_month_year_idx" ON "monthly_targets"("kpi_id", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_targets_kpi_id_seller_id_month_year_key" ON "monthly_targets"("kpi_id", "seller_id", "month", "year");

-- CreateIndex
CREATE INDEX "entries_company_id_kpi_id_seller_id_entry_date_idx" ON "entries"("company_id", "kpi_id", "seller_id", "entry_date");

-- CreateIndex
CREATE INDEX "entries_company_id_entry_date_idx" ON "entries"("company_id", "entry_date");

-- CreateIndex
CREATE UNIQUE INDEX "non_working_days_company_id_date_key" ON "non_working_days"("company_id", "date");

-- CreateIndex
CREATE INDEX "campaigns_company_id_idx" ON "campaigns"("company_id");

-- CreateIndex
CREATE INDEX "scoring_rules_campaign_id_idx" ON "scoring_rules"("campaign_id");

-- CreateIndex
CREATE INDEX "seasons_campaign_id_idx" ON "seasons"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_participants_campaign_id_seller_id_key" ON "campaign_participants"("campaign_id", "seller_id");

-- CreateIndex
CREATE INDEX "gamification_levels_campaign_id_idx" ON "gamification_levels"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "seller_points_campaign_id_season_id_seller_id_key" ON "seller_points"("campaign_id", "season_id", "seller_id");

-- CreateIndex
CREATE INDEX "sales_company_id_seller_id_sale_date_idx" ON "sales"("company_id", "seller_id", "sale_date");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sellers" ADD CONSTRAINT "sellers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sellers" ADD CONSTRAINT "sellers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_sectors" ADD CONSTRAINT "kpi_sectors_kpi_id_fkey" FOREIGN KEY ("kpi_id") REFERENCES "kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_sectors" ADD CONSTRAINT "kpi_sectors_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_sellers" ADD CONSTRAINT "kpi_sellers_kpi_id_fkey" FOREIGN KEY ("kpi_id") REFERENCES "kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_sellers" ADD CONSTRAINT "kpi_sellers_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_targets" ADD CONSTRAINT "monthly_targets_kpi_id_fkey" FOREIGN KEY ("kpi_id") REFERENCES "kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_targets" ADD CONSTRAINT "monthly_targets_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_kpi_id_fkey" FOREIGN KEY ("kpi_id") REFERENCES "kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry_schedules" ADD CONSTRAINT "entry_schedules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry_schedules" ADD CONSTRAINT "entry_schedules_kpi_id_fkey" FOREIGN KEY ("kpi_id") REFERENCES "kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_working_days" ADD CONSTRAINT "non_working_days_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoring_rules" ADD CONSTRAINT "scoring_rules_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoring_rules" ADD CONSTRAINT "scoring_rules_kpi_id_fkey" FOREIGN KEY ("kpi_id") REFERENCES "kpis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_participants" ADD CONSTRAINT "campaign_participants_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_participants" ADD CONSTRAINT "campaign_participants_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamification_levels" ADD CONSTRAINT "gamification_levels_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_points" ADD CONSTRAINT "seller_points_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_points" ADD CONSTRAINT "seller_points_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_points" ADD CONSTRAINT "seller_points_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
