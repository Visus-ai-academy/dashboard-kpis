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

  // Include sellers linked to the unit via team→sector,
  // AND sellers without any team (unlinked sellers)
  const sellers = await prisma.seller.findMany({
    where: {
      companyId,
      OR: [
        { team: { sector: { unitId } } },
        { teamId: null },
      ],
    },
    select: { id: true },
  });

  return sellers.map((s) => s.id);
}
