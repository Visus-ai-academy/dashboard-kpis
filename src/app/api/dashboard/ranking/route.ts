import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils/prisma-helpers";
import { getRemainingBusinessDays } from "@/lib/utils/dates";

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

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "startDate e endDate sao obrigatorios" } },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    const month = end.getMonth() + 1;
    const year = end.getFullYear();

    // Get primary KPI or specified
    const kpi = await prisma.kpi.findFirst({
      where: {
        companyId: session.user.companyId,
        isActive: true,
        ...(kpiId ? { id: kpiId } : { isPrimary: true }),
      },
    });

    if (!kpi) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "KPI nao encontrado" } },
        { status: 404 }
      );
    }

    // Get all active sellers
    const sellers = await prisma.seller.findMany({
      where: { companyId: session.user.companyId, isActive: true },
      orderBy: { name: "asc" },
    });

    // Get entries for the period
    const entries = await prisma.entry.findMany({
      where: {
        companyId: session.user.companyId,
        kpiId: kpi.id,
        entryDate: { gte: start, lte: end },
      },
    });

    // Get monthly targets
    const monthlyTargets = await prisma.monthlyTarget.findMany({
      where: {
        kpiId: kpi.id,
        month,
        year,
      },
    });

    // Get kpiSellers for custom targets
    const kpiSellers = await prisma.kpiSeller.findMany({
      where: { kpiId: kpi.id },
    });

    // Get non-working days
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const nonWorkingDays = await prisma.nonWorkingDay.findMany({
      where: {
        companyId: session.user.companyId,
        date: { gte: monthStart, lte: monthEnd },
      },
    });
    const nonWorkingDates = nonWorkingDays.map((d) => new Date(d.date));
    const remainingDays = getRemainingBusinessDays(month, year, nonWorkingDates);

    // Build ranking
    const ranking = sellers.map((seller) => {
      const achieved = entries
        .filter((e) => e.sellerId === seller.id)
        .reduce((sum, e) => sum + toNumber(e.value), 0);

      // Target priority: monthlyTarget for seller > kpiSeller custom target > kpi default
      const mt = monthlyTargets.find((t) => t.sellerId === seller.id);
      const ks = kpiSellers.find((k) => k.sellerId === seller.id);
      const target = mt
        ? toNumber(mt.targetValue)
        : ks?.customTarget
          ? toNumber(ks.customTarget)
          : toNumber(kpi.targetValue);

      const remaining = Math.max(0, target - achieved);
      const dailyTarget = remainingDays > 0 ? remaining / remainingDays : 0;
      const percentage = target > 0 ? (achieved / target) * 100 : 0;

      return {
        sellerId: seller.id,
        sellerName: seller.name,
        achieved,
        target,
        remaining,
        dailyTarget: Math.round(dailyTarget * 100) / 100,
        percentage: Math.round(percentage * 10) / 10,
      };
    });

    // Sort by achieved descending
    ranking.sort((a, b) => b.achieved - a.achieved);

    return NextResponse.json({
      success: true,
      data: {
        kpiId: kpi.id,
        kpiName: kpi.name,
        kpiType: kpi.type,
        ranking,
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/ranking error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
