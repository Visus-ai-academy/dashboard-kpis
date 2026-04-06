import { prisma } from "@/lib/prisma";

/**
 * Returns an array of seller IDs that belong to a specific unit.
 * If unitId is null/undefined, returns undefined (no filter).
 */
export async function getSellerIdsByUnit(
  companyId: string,
  unitId: string | null | undefined
): Promise<string[] | undefined> {
  if (!unitId) return undefined;

  const sellers = await prisma.seller.findMany({
    where: {
      companyId,
      team: { sector: { unitId } },
    },
    select: { id: true },
  });

  return sellers.map((s) => s.id);
}
