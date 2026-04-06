const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const r = await p.$executeRawUnsafe("UPDATE clients SET status = 'CLIENT' WHERE status = 'LEAD'");
  console.log("Clientes atualizados:", r);

  // Also check if there's a default value issue
  const r2 = await p.$executeRawUnsafe("ALTER TABLE clients ALTER COLUMN status SET DEFAULT 'CLIENT'");
  console.log("Default atualizado");

  await p.$disconnect();
}

main().catch(console.error);
