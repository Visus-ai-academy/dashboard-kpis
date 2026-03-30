import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils/prisma-helpers";

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
    const kpiId = searchParams.get("kpiId");
    const sellerId = searchParams.get("sellerId");

    if (!startDate || !endDate || !kpiId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "startDate, endDate e kpiId sao obrigatorios" } },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const month = end.getMonth() + 1;
    const year = end.getFullYear();

    // Get the KPI
    const kpi = await prisma.kpi.findFirst({
      where: {
        id: kpiId,
        companyId: session.user.companyId,
        isActive: true,
      },
    });

    if (!kpi) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "KPI nao encontrado" } },
        { status: 404 }
      );
    }

    // Get entries for the period
    const entries = await prisma.entry.findMany({
      where: {
        companyId: session.user.companyId,
        kpiId,
        entryDate: { gte: start, lte: end },
        ...(sellerId ? { sellerId } : {}),
      },
      orderBy: { entryDate: "asc" },
    });

    // Get the monthly target
    const monthlyTarget = await prisma.monthlyTarget.findFirst({
      where: {
        kpiId,
        month,
        year,
        sellerId: sellerId ?? null,
      },
    });

    const targetValue = monthlyTarget
      ? toNumber(monthlyTarget.targetValue)
      : toNumber(kpi.targetValue);

    // Aggregate entries by date (sum values per day)
    const dailyMap = new Map<string, number>();
    for (const entry of entries) {
      const dateKey = new Date(entry.entryDate).toISOString().split("T")[0];
      const prev = dailyMap.get(dateKey) ?? 0;
      dailyMap.set(dateKey, prev + toNumber(entry.value));
    }

    // Build daily data points sorted by date
    const sortedDates = Array.from(dailyMap.keys()).sort();

    // Calculate total days in the period for target projection
    const totalDays = sortedDates.length > 0 ? sortedDates.length : 1;
    const periodDays = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    const dailyTargetRate = targetValue / periodDays;

    let cumulative = 0;
    const dailyData = sortedDates.map((date, index) => {
      const dailyValue = dailyMap.get(date) ?? 0;
      cumulative += dailyValue;

      // Projected target: linear distribution across the period
      const dayNumber = Math.ceil(
        (new Date(date).getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      const projectedTarget = dailyTargetRate * dayNumber;

      return {
        date,
        value: dailyValue,
        cumulative,
        projectedTarget: Math.round(projectedTarget * 100) / 100,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        kpiId: kpi.id,
        kpiName: kpi.name,
        kpiType: kpi.type,
        chartType: kpi.chartType,
        targetValue,
        dailyData,
        period: { start: startDate, end: endDate },
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/chart-data error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
