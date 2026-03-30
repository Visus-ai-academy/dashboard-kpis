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

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "startDate e endDate sao obrigatorios" } },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate previous period of the same length
    const periodMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1); // day before start
    const prevStart = new Date(prevEnd.getTime() - periodMs);

    // Build the where clause
    const baseWhere = {
      companyId: session.user.companyId,
      ...(kpiId ? { kpiId } : {}),
      ...(sellerId ? { sellerId } : {}),
    };

    // Get active KPIs for this company
    const kpis = await prisma.kpi.findMany({
      where: {
        companyId: session.user.companyId,
        isActive: true,
        ...(kpiId ? { id: kpiId } : {}),
      },
      orderBy: { displayOrder: "asc" },
    });

    // Get entries for current period
    const currentEntries = await prisma.entry.findMany({
      where: {
        ...baseWhere,
        entryDate: { gte: start, lte: end },
      },
    });

    // Get entries for previous period
    const previousEntries = await prisma.entry.findMany({
      where: {
        ...baseWhere,
        entryDate: { gte: prevStart, lte: prevEnd },
      },
    });

    // Aggregate per KPI
    const comparison = kpis.map((kpi) => {
      const currentSum = currentEntries
        .filter((e) => e.kpiId === kpi.id)
        .reduce((sum, e) => sum + toNumber(e.value), 0);

      const previousSum = previousEntries
        .filter((e) => e.kpiId === kpi.id)
        .reduce((sum, e) => sum + toNumber(e.value), 0);

      const difference = currentSum - previousSum;
      const percentageChange = previousSum !== 0
        ? ((difference / previousSum) * 100)
        : currentSum > 0 ? 100 : 0;

      return {
        kpiId: kpi.id,
        kpiName: kpi.name,
        kpiType: kpi.type,
        currentValue: currentSum,
        previousValue: previousSum,
        difference,
        percentageChange: Math.round(percentageChange * 10) / 10,
        target: toNumber(kpi.targetValue),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        comparison,
        currentPeriod: { start: startDate, end: endDate },
        previousPeriod: { start: prevStart.toISOString().split("T")[0], end: prevEnd.toISOString().split("T")[0] },
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/comparison error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
