import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils/prisma-helpers";
import { getRemainingBusinessDaysFromDB } from "@/lib/queries/projections";
import { getSellerIdsByUnit } from "@/lib/queries/unit-sellers";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Nao autorizado" } },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    const kpiId = searchParams.get("kpiId");
    const sellerId = searchParams.get("sellerId");
    const unitId = searchParams.get("unitId");

    // Default to current month
    const now = new Date();
    const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1));
    const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()));

    // Get primary KPI (or specified KPI)
    const kpiWhere = {
      companyId: session.user.companyId,
      isActive: true,
      ...(kpiId ? { id: kpiId } : { isPrimary: true }),
    };

    const kpi = await prisma.kpi.findFirst({
      where: kpiWhere,
      orderBy: { displayOrder: "asc" },
    });

    if (!kpi) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "KPI nao encontrado" } },
        { status: 404 }
      );
    }

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    // Use refined projection that queries NonWorkingDays from DB
    const projection = await getRemainingBusinessDaysFromDB(
      session.user.companyId, month, year
    );

    const { totalBusinessDays, remainingBusinessDays } = projection;

    // Resolve unit filter to seller IDs
    const unitSellerIds = await getSellerIdsByUnit(session.user.companyId, unitId);

    // Build seller filter
    const sellerFilter = sellerId
      ? { sellerId }
      : unitSellerIds
        ? { sellerId: { in: unitSellerIds } }
        : {};

    // Get the month target: first from monthlyTargets, fallback to kpi.targetValue
    const monthlyTarget = await prisma.monthlyTarget.findFirst({
      where: {
        kpiId: kpi.id,
        month,
        year,
        sellerId: sellerId ?? null,
      },
    });

    const target = monthlyTarget
      ? toNumber(monthlyTarget.targetValue)
      : toNumber(kpi.targetValue);

    // Sum achieved so far this month
    const entryWhere = {
      companyId: session.user.companyId,
      kpiId: kpi.id,
      entryDate: { gte: monthStart, lte: monthEnd },
      ...sellerFilter,
    };

    const entriesAgg = await prisma.entry.aggregate({
      where: entryWhere,
      _sum: { value: true },
    });

    const achieved = toNumber(entriesAgg._sum.value);
    const remaining = Math.max(0, target - achieved);

    const dailyTarget = remainingBusinessDays > 0
      ? remaining / remainingBusinessDays
      : 0;

    const progressPercent = target > 0
      ? Math.round((achieved / target) * 1000) / 10
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        kpiId: kpi.id,
        kpiName: kpi.name,
        kpiType: kpi.type,
        month,
        year,
        target,
        achieved,
        remaining,
        totalBusinessDays,
        remainingBusinessDays,
        dailyTarget: Math.round(dailyTarget * 100) / 100,
        progressPercent,
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/daily-target error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
