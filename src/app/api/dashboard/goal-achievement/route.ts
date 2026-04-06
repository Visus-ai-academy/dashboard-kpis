import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils/prisma-helpers";
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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sellerId = searchParams.get("sellerId");
    const unitId = searchParams.get("unitId");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "startDate e endDate sao obrigatorios" } },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const month = end.getMonth() + 1;
    const year = end.getFullYear();

    // Resolve unit filter to seller IDs
    const unitSellerIds = await getSellerIdsByUnit(session.user.companyId, unitId);

    // Build seller filter
    const sellerFilter = sellerId
      ? { sellerId }
      : unitSellerIds
        ? { sellerId: { in: unitSellerIds } }
        : {};

    // Get all active KPIs
    const kpis = await prisma.kpi.findMany({
      where: {
        companyId: session.user.companyId,
        isActive: true,
      },
      orderBy: { displayOrder: "asc" },
    });

    // Get entries for the period
    const entries = await prisma.entry.findMany({
      where: {
        companyId: session.user.companyId,
        entryDate: { gte: start, lte: end },
        ...sellerFilter,
      },
    });

    // Get monthly targets
    const monthlyTargets = await prisma.monthlyTarget.findMany({
      where: {
        month,
        year,
        kpiId: { in: kpis.map((k) => k.id) },
        sellerId: sellerId ?? null,
      },
    });

    // Build goals
    const goals = kpis.map((kpi) => {
      const achieved = entries
        .filter((e) => e.kpiId === kpi.id)
        .reduce((sum, e) => sum + toNumber(e.value), 0);

      const mt = monthlyTargets.find((t) => t.kpiId === kpi.id);
      const target = mt ? toNumber(mt.targetValue) : toNumber(kpi.targetValue);
      const percentage = target > 0 ? (achieved / target) * 100 : 0;
      const met = percentage >= 100;

      return {
        kpiId: kpi.id,
        kpiName: kpi.name,
        kpiType: kpi.type,
        achieved,
        target,
        percentage: Math.round(percentage * 10) / 10,
        met,
      };
    });

    const totalGoals = goals.length;
    const metCount = goals.filter((g) => g.met).length;
    const overallAchieved = goals.reduce((sum, g) => sum + g.achieved, 0);
    const overallTarget = goals.reduce((sum, g) => sum + g.target, 0);
    const overallPercentage = overallTarget > 0
      ? Math.round((overallAchieved / overallTarget) * 1000) / 10
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        goals,
        totalGoals,
        metCount,
        overallPercentage,
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/goal-achievement error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
