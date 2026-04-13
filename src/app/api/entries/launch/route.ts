import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { entryBatchCreateSchema } from "@/lib/validators/entry";
import { toNumber } from "@/lib/utils/prisma-helpers";
import { Prisma } from "@prisma/client";

// ────────────────────────────────────────────────────────────
// Helpers: date ranges for periodicity checks
// ────────────────────────────────────────────────────────────

function dayRange(base: Date) {
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(base);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function weekRange(base: Date) {
  const day = base.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = new Date(base);
  start.setDate(base.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function monthRange(base: Date) {
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function getDateRange(periodicity: string, base?: Date) {
  const d = base ?? new Date();
  switch (periodicity) {
    case "DAILY":
      return dayRange(d);
    case "WEEKLY":
      return weekRange(d);
    case "MONTHLY":
      return thisMonthRange();
    case "NONE":
      return null;
    default:
      return todayRange();
  }
}

// ────────────────────────────────────────────────────────────
// GET /api/entries/launch
// Return seller info + KPIs with fill status (session-based)
// ────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "SELLER" || !session.user.sellerId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Acesso não autorizado" },
        },
        { status: 401 }
      );
    }

    const sellerId = session.user.sellerId;
    const companyId = session.user.companyId;

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        name: true,
        isActive: true,
        team: { select: { name: true } },
      },
    });

    if (!seller || !seller.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Vendedor não encontrado ou inativo" },
        },
        { status: 404 }
      );
    }

    // Get all active KPIs for the seller's company
    const kpis = await prisma.kpi.findMany({
      where: {
        companyId,
        isActive: true,
        OR: [
          { scope: "COMPANY" },
          { kpiSellers: { some: { sellerId } } },
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
        companyId,
        kpiId: { in: kpis.map((k) => k.id) },
      },
      select: { kpiId: true, frequency: true },
    });
    const scheduleMap = new Map(
      entrySchedules.map((s) => [s.kpiId, s.frequency])
    );

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
            sellerId,
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
    console.error("GET /api/entries/launch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" },
      },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────────────
// POST /api/entries/launch
// Submit flat entries: [{ kpiId, value, notes? }]
// ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "SELLER" || !session.user.sellerId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Acesso não autorizado" },
        },
        { status: 401 }
      );
    }

    const sellerId = session.user.sellerId;
    const companyId = session.user.companyId;

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { id: true, companyId: true, isActive: true },
    });

    if (!seller || !seller.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Vendedor não encontrado ou inativo" },
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    // Support both new format { entryDate, entries } and legacy array format
    const payload = Array.isArray(body) ? { entries: body } : body;
    const parsed = entryBatchCreateSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Dados inválidos",
          },
        },
        { status: 400 }
      );
    }

    const { entries, entryDate: customDate } = parsed.data;
    const targetDate = customDate ?? new Date().toISOString().split("T")[0];

    // Validate KPIs exist and belong to the company
    const kpiIds = [...new Set(entries.map((e) => e.kpiId))];
    const kpis = await prisma.kpi.findMany({
      where: { id: { in: kpiIds }, companyId, isActive: true },
      select: { id: true, periodicity: true, type: true },
    });

    const kpiMap = new Map(kpis.map((k) => [k.id, k]));

    for (const entry of entries) {
      if (!kpiMap.has(entry.kpiId)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `KPI ${entry.kpiId} não encontrado ou inativo`,
            },
          },
          { status: 400 }
        );
      }
    }

    // Fetch entry schedules for duplicate check
    const postSchedules = await prisma.entrySchedule.findMany({
      where: {
        companyId,
        kpiId: { in: kpiIds },
      },
      select: { kpiId: true, frequency: true },
    });
    const postScheduleMap = new Map(
      postSchedules.map((s) => [s.kpiId, s.frequency])
    );

    // Check duplicates per KPI
    const duplicateErrors: string[] = [];
    for (const kpiId of kpiIds) {
      const kpi = kpiMap.get(kpiId)!;
      const frequency = postScheduleMap.get(kpiId) ?? kpi.periodicity;
      const range = getDateRange(frequency, new Date(targetDate + "T12:00:00"));
      if (!range) continue;
      const existing = await prisma.entry.findFirst({
        where: {
          kpiId,
          sellerId,
          entryDate: { gte: range.start, lte: range.end },
        },
      });
      if (existing) {
        duplicateErrors.push(kpiId);
      }
    }

    if (duplicateErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_ENTRY",
            message: `Já existem lançamentos para ${duplicateErrors.length} KPI(s) neste período`,
          },
        },
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
              companyId,
              kpiId,
              sellerId,
              clientId: entry.clientId || null,
              value: entry.value,
              entryDate: new Date(targetDate),
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

        // Calculate gamification points once per KPI group
        await calculatePoints(tx, sellerId, kpiId, totalValueForPoints, companyId);
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
    console.error("POST /api/entries/launch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" },
      },
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
    const currentTotal = existingPoints
      ? toNumber(existingPoints.totalPoints)
      : 0;
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
