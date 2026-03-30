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
    default:
      return todayRange();
  }
}

// ────────────────────────────────────────────────────────────
// GET /api/launch/[token]
// Validate token, return seller info + KPIs with fill status
// ────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const seller = await prisma.seller.findUnique({
      where: { accessToken: token },
      select: {
        id: true,
        name: true,
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

    // Get all active KPIs for the seller's company
    // Either company-wide or specifically assigned to this seller
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

    // Check which KPIs have been filled for the current period
    const kpisWithStatus = await Promise.all(
      kpis.map(async (kpi) => {
        const range = getDateRange(kpi.periodicity);
        const existingEntry = await prisma.entry.findFirst({
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

        return {
          ...kpi,
          targetValue: toNumber(kpi.targetValue),
          filled: !!existingEntry,
          existingValue: existingEntry ? toNumber(existingEntry.value) : null,
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
// Submit entries for the seller
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
    const kpiIds = entries.map((e) => e.kpiId);
    const kpis = await prisma.kpi.findMany({
      where: { id: { in: kpiIds }, companyId: seller.companyId, isActive: true },
      select: { id: true, periodicity: true },
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

    // Check duplicates: same kpi + seller + current period
    const duplicateErrors: string[] = [];
    for (const entry of entries) {
      const kpi = kpiMap.get(entry.kpiId)!;
      const range = getDateRange(kpi.periodicity);
      const existing = await prisma.entry.findFirst({
        where: {
          kpiId: entry.kpiId,
          sellerId: seller.id,
          entryDate: { gte: range.start, lte: range.end },
        },
      });
      if (existing) {
        duplicateErrors.push(entry.kpiId);
      }
    }

    if (duplicateErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_ENTRY", message: `Já existem lançamentos para ${duplicateErrors.length} KPI(s) neste período` } },
        { status: 409 }
      );
    }

    // Create entries in a transaction and calculate points
    const createdEntries = await prisma.$transaction(async (tx) => {
      const created = [];
      for (const entry of entries) {
        const newEntry = await tx.entry.create({
          data: {
            companyId: seller.companyId,
            kpiId: entry.kpiId,
            sellerId: seller.id,
            value: entry.value,
            entryDate: new Date(todayISO),
            notes: entry.notes,
          },
        });
        created.push(newEntry);

        // Feature 4.4: Calculate points on entry
        await calculatePoints(tx, seller.id, entry.kpiId, entry.value, seller.companyId);
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
// Feature 4.4: Points calculation on entry
// ────────────────────────────────────────────────────────────

async function calculatePoints(
  tx: Prisma.TransactionClient,
  sellerId: string,
  kpiId: string,
  value: number,
  companyId: string
) {
  // Find active campaigns with scoring rules linked to this KPI
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

    // Check daily cap
    if (maxPerDay > 0) {
      const { start: dayStart, end: dayEnd } = todayRange();
      const todayEntries = await tx.entry.findMany({
        where: {
          sellerId,
          kpiId,
          entryDate: { gte: dayStart, lte: dayEnd },
        },
        select: { value: true },
      });
      const todayTotal = todayEntries.reduce((sum, e) => sum + toNumber(e.value), 0) * toNumber(rule.pointsPerUnit);
      const remainingDaily = Math.max(0, maxPerDay - todayTotal + points); // include current
      points = Math.min(points, remainingDaily);
    }

    // Check weekly cap
    if (maxPerWeek > 0) {
      const { start: weekStart, end: weekEnd } = thisWeekRange();
      const weekEntries = await tx.entry.findMany({
        where: {
          sellerId,
          kpiId,
          entryDate: { gte: weekStart, lte: weekEnd },
        },
        select: { value: true },
      });
      const weekTotal = weekEntries.reduce((sum, e) => sum + toNumber(e.value), 0) * toNumber(rule.pointsPerUnit);
      const remainingWeekly = Math.max(0, maxPerWeek - weekTotal + points);
      points = Math.min(points, remainingWeekly);
    }

    if (points <= 0) continue;

    // Upsert seller points
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
