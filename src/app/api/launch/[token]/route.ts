import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { entryBatchCreateSchema } from "@/lib/validators/entry";
import { toNumber } from "@/lib/utils/prisma-helpers";
import { Prisma } from "@prisma/client";

// ────────────────────────────────────────────────────────────
// Helpers: date ranges for periodicity checks
// ────────────────────────────────────────────────────────────

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function thisWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday-based week
  const start = new Date(now);
  start.setDate(now.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function thisMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function getDateRange(periodicity: string) {
  switch (periodicity) {
    case "DAILY":
      return todayRange();
    case "WEEKLY":
      return thisWeekRange();
    case "MONTHLY":
      return thisMonthRange();
    case "NONE":
      return null;
    default:
      return todayRange();
  }
}

// ────────────────────────────────────────────────────────────
// GET /api/launch/[token]
// Validate token, return seller info + KPIs with fill status
// ────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const accessCode = searchParams.get("accessCode");

    const seller = await prisma.seller.findUnique({
      where: { accessToken: token },
      select: {
        id: true,
        name: true,
        email: true,
        accessCode: true,
        companyId: true,
        isActive: true,
        team: { select: { name: true } },
      },
    });

    if (!seller || !seller.isActive) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Link inválido ou vendedor inativo" } },
        { status: 404 }
      );
    }

    // Direct access — no authentication required for launch links

    // Get all active KPIs for the seller's company
    const kpis = await prisma.kpi.findMany({
      where: {
        companyId: seller.companyId,
        isActive: true,
        OR: [
          { scope: "COMPANY" },
          { kpiSellers: { some: { sellerId: seller.id } } },
        ],
      },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        periodicity: true,
        targetValue: true,
        isRequired: true,
      },
    });

    // Fetch entry schedules to check for frequency overrides
    const entrySchedules = await prisma.entrySchedule.findMany({
      where: {
        companyId: seller.companyId,
        kpiId: { in: kpis.map((k) => k.id) },
      },
      select: { kpiId: true, frequency: true },
    });
    const scheduleMap = new Map(entrySchedules.map((s) => [s.kpiId, s.frequency]));

    // Check which KPIs have been filled for the current period
    const kpisWithStatus = await Promise.all(
      kpis.map(async (kpi) => {
        const frequency = scheduleMap.get(kpi.id) ?? kpi.periodicity;
        const range = getDateRange(frequency);

        if (!range) {
          return {
            ...kpi,
            targetValue: toNumber(kpi.targetValue),
            filled: false,
            existingValue: null,
          };
        }

        const existingEntries = await prisma.entry.findMany({
          where: {
            kpiId: kpi.id,
            sellerId: seller.id,
            entryDate: {
              gte: range.start,
              lte: range.end,
            },
          },
          select: { id: true, value: true },
        });

        const hasEntries = existingEntries.length > 0;
        let existingValue: number | null = null;
        if (hasEntries) {
          if (kpi.type === "MONETARY") {
            existingValue = existingEntries.reduce((sum, e) => sum + toNumber(e.value), 0);
          } else {
            existingValue = existingEntries.reduce((sum, e) => sum + toNumber(e.value), 0);
          }
        }

        return {
          ...kpi,
          targetValue: toNumber(kpi.targetValue),
          filled: hasEntries,
          existingValue,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        seller: {
          id: seller.id,
          name: seller.name,
          teamName: seller.team?.name ?? null,
        },
        kpis: kpisWithStatus,
        currentDate: new Date().toISOString().split("T")[0],
      },
    });
  } catch (error) {
    console.error("GET /api/launch/[token] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────────────
// POST /api/launch/[token]
// Submit flat entries: [{ kpiId, value, notes? }]
// ────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const seller = await prisma.seller.findUnique({
      where: { accessToken: token },
      select: { id: true, companyId: true, isActive: true },
    });

    if (!seller || !seller.isActive) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Link inválido ou vendedor inativo" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = entryBatchCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados inválidos" } },
        { status: 400 }
      );
    }

    const entries = parsed.data;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString().split("T")[0];

    // Validate KPIs exist and belong to the company
    const kpiIds = [...new Set(entries.map((e) => e.kpiId))];
    const kpis = await prisma.kpi.findMany({
      where: { id: { in: kpiIds }, companyId: seller.companyId, isActive: true },
      select: { id: true, periodicity: true, type: true },
    });

    const kpiMap = new Map(kpis.map((k) => [k.id, k]));

    for (const entry of entries) {
      if (!kpiMap.has(entry.kpiId)) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: `KPI ${entry.kpiId} não encontrado ou inativo` } },
          { status: 400 }
        );
      }
    }

    // Fetch entry schedules for duplicate check
    const postSchedules = await prisma.entrySchedule.findMany({
      where: {
        companyId: seller.companyId,
        kpiId: { in: kpiIds },
      },
      select: { kpiId: true, frequency: true },
    });
    const postScheduleMap = new Map(postSchedules.map((s) => [s.kpiId, s.frequency]));

    // Check duplicates per KPI
    const duplicateErrors: string[] = [];
    for (const kpiId of kpiIds) {
      const kpi = kpiMap.get(kpiId)!;
      const frequency = postScheduleMap.get(kpiId) ?? kpi.periodicity;
      const range = getDateRange(frequency);
      if (!range) continue;
      const existing = await prisma.entry.findFirst({
        where: {
          kpiId,
          sellerId: seller.id,
          entryDate: { gte: range.start, lte: range.end },
        },
      });
      if (existing) {
        duplicateErrors.push(kpiId);
      }
    }

    if (duplicateErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_ENTRY", message: `Já existem lançamentos para ${duplicateErrors.length} KPI(s) neste período` } },
        { status: 409 }
      );
    }

    // Create all entries in a transaction and calculate points
    const createdEntries = await prisma.$transaction(async (tx) => {
      const created = [];

      // Group entries by kpiId for points calculation
      const groupedByKpi = new Map<string, typeof entries>();
      for (const entry of entries) {
        const group = groupedByKpi.get(entry.kpiId) ?? [];
        group.push(entry);
        groupedByKpi.set(entry.kpiId, group);
      }

      for (const [kpiId, kpiEntries] of groupedByKpi) {
        const kpi = kpiMap.get(kpiId)!;
        let totalValueForPoints = 0;

        for (const entry of kpiEntries) {
          const newEntry = await tx.entry.create({
            data: {
              companyId: seller.companyId,
              kpiId,
              sellerId: seller.id,
              clientId: entry.clientId || null,
              value: entry.value,
              entryDate: new Date(todayISO),
              notes: entry.notes ?? null,
            },
          });
          created.push(newEntry);

          if (kpi.type === "MONETARY") {
            totalValueForPoints += entry.value;
          } else {
            totalValueForPoints += entry.value;
          }
        }

        // Calculate points once per KPI group with total value
        await calculatePoints(tx, seller.id, kpiId, totalValueForPoints, seller.companyId);
      }
      return created;
    });

    return NextResponse.json(
      {
        success: true,
        data: createdEntries.map((e) => ({
          ...e,
          value: toNumber(e.value),
        })),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/launch/[token] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────────────
// Points calculation on entry
// ────────────────────────────────────────────────────────────

async function calculatePoints(
  tx: Prisma.TransactionClient,
  sellerId: string,
  kpiId: string,
  value: number,
  companyId: string
) {
  const scoringRules = await tx.scoringRule.findMany({
    where: {
      kpiId,
      isActive: true,
      campaign: {
        isActive: true,
        companyId,
        participants: { some: { sellerId } },
      },
    },
    include: {
      campaign: {
        include: {
          seasons: {
            where: { isActive: true },
            take: 1,
          },
        },
      },
    },
  });

  for (const rule of scoringRules) {
    const activeSeason = rule.campaign.seasons[0];
    if (!activeSeason) continue;

    let points = value * toNumber(rule.pointsPerUnit);
    const maxPerDay = toNumber(rule.maxPointsPerDay);
    const maxPerWeek = toNumber(rule.maxPointsPerWeek);

    if (maxPerDay > 0) {
      points = Math.min(points, maxPerDay);
    }

    if (maxPerWeek > 0) {
      points = Math.min(points, maxPerWeek);
    }

    const existingPoints = await tx.sellerPoints.findUnique({
      where: {
        campaignId_seasonId_sellerId: {
          campaignId: rule.campaignId,
          seasonId: activeSeason.id,
          sellerId,
        },
      },
      select: { totalPoints: true },
    });
    const currentTotal = existingPoints ? toNumber(existingPoints.totalPoints) : 0;
    if (maxPerWeek > 0 && currentTotal + points > maxPerWeek) {
      points = Math.max(0, maxPerWeek - currentTotal);
    }

    if (points <= 0) continue;

    const existing = await tx.sellerPoints.findUnique({
      where: {
        campaignId_seasonId_sellerId: {
          campaignId: rule.campaignId,
          seasonId: activeSeason.id,
          sellerId,
        },
      },
    });

    if (existing) {
      await tx.sellerPoints.update({
        where: { id: existing.id },
        data: {
          totalPoints: { increment: points },
        },
      });
    } else {
      await tx.sellerPoints.create({
        data: {
          campaignId: rule.campaignId,
          seasonId: activeSeason.id,
          sellerId,
          totalPoints: points,
        },
      });
    }
  }
}
