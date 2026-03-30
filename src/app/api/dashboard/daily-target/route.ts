import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils/prisma-helpers";
import {
  getBusinessDaysInMonth,
  getRemainingBusinessDays,
} from "@/lib/utils/dates";

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
    const includeSaturday = searchParams.get("includeSaturday") === "true";
    const includeSunday = searchParams.get("includeSunday") === "true";

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

    // Get non-working days for this company in the given month
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    const nonWorkingDays = await prisma.nonWorkingDay.findMany({
      where: {
        companyId: session.user.companyId,
        date: { gte: monthStart, lte: monthEnd },
      },
    });

    const nonWorkingDates = nonWorkingDays.map((d) => new Date(d.date));

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
      ...(sellerId ? { sellerId } : {}),
    };

    const entriesAgg = await prisma.entry.aggregate({
      where: entryWhere,
      _sum: { value: true },
    });

    const achieved = toNumber(entriesAgg._sum.value);
    const remaining = Math.max(0, target - achieved);

    // Business days
    const totalBusinessDays = getBusinessDaysInMonth(
      month, year, nonWorkingDates, includeSaturday, includeSunday
    );
    const remainingBusinessDays = getRemainingBusinessDays(
      month, year, nonWorkingDates, includeSaturday, includeSunday
    );

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
