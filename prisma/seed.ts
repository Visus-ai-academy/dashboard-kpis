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
