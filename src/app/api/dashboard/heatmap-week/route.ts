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
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    const sellerId = searchParams.get("sellerId");
    const unitId = searchParams.get("unitId");

    // Resolve unit filter to seller IDs
    const unitSellerIds = await getSellerIdsByUnit(session.user.companyId, unitId);

    // Build seller filter
    const sellerFilter = sellerId
      ? { sellerId }
      : unitSellerIds
        ? { sellerId: { in: unitSellerIds } }
        : {};

    // Last 6 months of sales
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    const sales = await prisma.sale.findMany({
      where: {
        companyId: session.user.companyId,
        saleDate: { gte: sixMonthsAgo },
        ...sellerFilter,
      },
      select: { amount: true, saleDate: true },
    });

    // Group by day of week (0=Sunday..6=Saturday)
    const dayTotals: Record<number, { total: number; count: number }> = {};
    for (let i = 0; i < 7; i++) {
      dayTotals[i] = { total: 0, count: 0 };
    }

    for (const sale of sales) {
      const dayOfWeek = new Date(sale.saleDate).getDay();
      dayTotals[dayOfWeek].total += toNumber(sale.amount);
      dayTotals[dayOfWeek].count += 1;
    }

    const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    const heatmapData = dayLabels.map((label, index) => {
      const { total, count } = dayTotals[index];
      return {
        dayIndex: index,
        dayLabel: label,
        average: count > 0 ? Math.round(total / count) : 0,
        total: Math.round(total),
        count,
      };
    });

    return NextResponse.json({
      success: true,
      data: { heatmapData },
    });
  } catch (error) {
    console.error("GET /api/dashboard/heatmap-week error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
