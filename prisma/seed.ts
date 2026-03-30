import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function generateAccessCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

async function main() {
  console.log("Seeding database...");

  // ── Company ──────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { slug: "visus-demo" },
    update: {},
    create: {
      name: "Visus Demo",
      slug: "visus-demo",
    },
  });
  console.log(`Company: ${company.name} (${company.id})`);

  // ── Admin User ───────────────────────────────────────────
  const passwordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@visus.com" },
    update: {},
    create: {
      companyId: company.id,
      email: "admin@visus.com",
      passwordHash,
      name: "Admin Visus",
      role: "ADMIN",
    },
  });
  console.log(`Admin user: ${admin.email}`);

  // ── Units ────────────────────────────────────────────────
  const units = await Promise.all(
    ["Matriz", "Filial SP"].map((name) =>
      prisma.unit.upsert({
        where: {
          id: `seed-unit-${name.toLowerCase().replace(/\s/g, "-")}`,
        },
        update: {},
        create: {
          id: `seed-unit-${name.toLowerCase().replace(/\s/g, "-")}`,
          companyId: company.id,
          name,
        },
      })
    )
  );
  console.log(`Units: ${units.map((u) => u.name).join(", ")}`);

  // ── Sectors ──────────────────────────────────────────────
  const sectorData = [
    { name: "SDR", unitId: units[0].id },
    { name: "Varejo", unitId: units[1].id },
  ];

  const sectors = await Promise.all(
    sectorData.map((s) =>
      prisma.sector.upsert({
        where: {
          id: `seed-sector-${s.name.toLowerCase()}`,
        },
        update: {},
        create: {
          id: `seed-sector-${s.name.toLowerCase()}`,
          companyId: company.id,
          name: s.name,
          unitId: s.unitId,
        },
      })
    )
  );
  console.log(`Sectors: ${sectors.map((s) => s.name).join(", ")}`);

  // ── Teams ────────────────────────────────────────────────
  const teamData = [
    { name: "SDR Alpha", sectorId: sectors[0].id },
    { name: "Varejo Prime", sectorId: sectors[1].id },
  ];

  const teams = await Promise.all(
    teamData.map((t) =>
      prisma.team.upsert({
        where: {
          id: `seed-team-${t.name.toLowerCase().replace(/\s/g, "-")}`,
        },
        update: {},
        create: {
          id: `seed-team-${t.name.toLowerCase().replace(/\s/g, "-")}`,
          companyId: company.id,
          name: t.name,
          sectorId: t.sectorId,
        },
      })
    )
  );
  console.log(`Teams: ${teams.map((t) => t.name).join(", ")}`);

  // ── Sellers ──────────────────────────────────────────────
  const sellerData = [
    { name: "Ana Silva", email: "ana@visus.com", teamId: teams[0].id },
    { name: "Bruno Costa", email: "bruno@visus.com", teamId: teams[0].id },
    { name: "Carla Mendes", email: "carla@visus.com", teamId: teams[0].id },
    { name: "Diego Rocha", email: "diego@visus.com", teamId: teams[1].id },
    { name: "Elena Souza", email: "elena@visus.com", teamId: teams[1].id },
  ];

  const sellers = await Promise.all(
    sellerData.map((s, i) =>
      prisma.seller.upsert({
        where: {
          accessCode: `SEED000${i + 1}`,
        },
        update: {},
        create: {
          id: `seed-seller-${i + 1}`,
          companyId: company.id,
          name: s.name,
          email: s.email,
          phone: `(11) 9${String(9000 + i).padStart(4, "0")}-${String(1000 + i).padStart(4, "0")}`,
          teamId: s.teamId,
          accessCode: `SEED000${i + 1}`,
        },
      })
    )
  );
  console.log(
    `Sellers: ${sellers.map((s) => `${s.name} (code: ${s.accessCode}, token: ${s.accessToken})`).join("\n  ")}`
  );

  // ── KPIs ──────────────────────────────────────────────────
  const kpiData = [
    { id: "seed-kpi-faturamento", name: "Faturamento Diário", type: "MONETARY" as const, periodicity: "DAILY" as const, targetValue: 50000, isPrimary: true, chartType: "LINE" as const, displayOrder: 1 },
    { id: "seed-kpi-ligacoes", name: "Ligações Realizadas", type: "NUMERIC" as const, periodicity: "DAILY" as const, targetValue: 200, isPrimary: false, chartType: "BAR" as const, displayOrder: 2 },
    { id: "seed-kpi-reunioes", name: "Reunião Marcadas no Dia", type: "NUMERIC" as const, periodicity: "DAILY" as const, targetValue: 30, isPrimary: false, chartType: "AREA" as const, displayOrder: 3 },
    { id: "seed-kpi-conversao", name: "Taxa de Conversão", type: "PERCENTAGE" as const, periodicity: "MONTHLY" as const, targetValue: 25, isPrimary: false, chartType: "LINE" as const, displayOrder: 4 },
  ];

  const kpis = await Promise.all(
    kpiData.map((k) =>
      prisma.kpi.upsert({
        where: { id: k.id },
        update: {},
        create: {
          id: k.id,
          companyId: company.id,
          name: k.name,
          type: k.type,
          periodicity: k.periodicity,
          targetValue: k.targetValue,
          isPrimary: k.isPrimary,
          chartType: k.chartType,
          displayOrder: k.displayOrder,
          isIndividual: true,
          isRequired: true,
          scope: "COMPANY",
        },
      })
    )
  );
  console.log(`KPIs: ${kpis.map((k) => k.name).join(", ")}`);

  // ── Entries (30 days of realistic data) ─────────────────
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const today = now.getDate();

  // Delete existing seed entries to avoid duplicates on re-seed
  await prisma.entry.deleteMany({
    where: { companyId: company.id, kpiId: { in: kpis.map((k) => k.id) } },
  });

  const entries: {
    companyId: string;
    kpiId: string;
    sellerId: string;
    value: number;
    entryDate: Date;
  }[] = [];

  for (let day = 1; day <= Math.min(today, 30); day++) {
    const entryDate = new Date(currentYear, currentMonth, day);
    const dayOfWeek = entryDate.getDay();

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    for (const seller of sellers) {
      // Faturamento: R$1500-3500 per seller per day
      const faturamento = 1500 + Math.round(Math.random() * 2000);
      entries.push({
        companyId: company.id,
        kpiId: "seed-kpi-faturamento",
        sellerId: seller.id,
        value: faturamento,
        entryDate,
      });

      // Ligações: 5-15 per seller per day
      const ligacoes = 5 + Math.floor(Math.random() * 11);
      entries.push({
        companyId: company.id,
        kpiId: "seed-kpi-ligacoes",
        sellerId: seller.id,
        value: ligacoes,
        entryDate,
      });

      // Reuniões: 0-4 per seller per day
      const reunioes = Math.floor(Math.random() * 5);
      entries.push({
        companyId: company.id,
        kpiId: "seed-kpi-reunioes",
        sellerId: seller.id,
        value: reunioes,
        entryDate,
      });
    }
  }

  await prisma.entry.createMany({ data: entries });
  console.log(`Entries created: ${entries.length}`);

  // ── Sales (matching faturamento entries) ────────────────
  await prisma.sale.deleteMany({
    where: { companyId: company.id },
  });

  const sales: {
    companyId: string;
    sellerId: string;
    amount: number;
    saleDate: Date;
  }[] = [];

  for (const entry of entries.filter((e) => e.kpiId === "seed-kpi-faturamento")) {
    sales.push({
      companyId: company.id,
      sellerId: entry.sellerId,
      amount: entry.value,
      saleDate: entry.entryDate,
    });
  }

  await prisma.sale.createMany({ data: sales });
  console.log(`Sales created: ${sales.length}`);

  console.log("\nSeed completed successfully!");
  console.log(`\nLogin credentials: admin@visus.com / admin123`);
  console.log(
    `\nSeller launch URLs:\n${sellers.map((s) => `  ${s.name}: /launch/${s.accessToken}`).join("\n")}`
  );
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
