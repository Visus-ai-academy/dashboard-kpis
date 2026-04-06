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

    // Build a matrix: rows = day (1-31), columns = months
    // Collect unique months
    const monthsSet = new Set<string>();
    for (const sale of sales) {
      const d = new Date(sale.saleDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthsSet.add(key);
    }
    const months = Array.from(monthsSet).sort();

    const monthLabels: Record<number, string> = {
      1: "Jan", 2: "Fev", 3: "Mar", 4: "Abr",
      5: "Mai", 6: "Jun", 7: "Jul", 8: "Ago",
      9: "Set", 10: "Out", 11: "Nov", 12: "Dez",
    };

    // Matrix: { day, [monthKey]: amount }
    type CellData = { total: number; count: number };
    const matrix: Record<number, Record<string, CellData>> = {};
    for (let day = 1; day <= 31; day++) {
      matrix[day] = {};
      for (const m of months) {
        matrix[day][m] = { total: 0, count: 0 };
      }
    }

    let globalMin = Infinity;
    let globalMax = 0;

    for (const sale of sales) {
      const d = new Date(sale.saleDate);
      const day = d.getDate();
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const amount = toNumber(sale.amount);
      matrix[day][monthKey].total += amount;
      matrix[day][monthKey].count += 1;
    }

    // Build the output grid
    const grid: { day: number; cells: { monthKey: string; monthLabel: string; value: number }[] }[] = [];

    for (let day = 1; day <= 31; day++) {
      const cells = months.map((monthKey) => {
        const cell = matrix[day][monthKey];
        const value = cell.count > 0 ? Math.round(cell.total) : 0;
        if (value > 0) {
          if (value < globalMin) globalMin = value;
          if (value > globalMax) globalMax = value;
        }
        const [yearStr, monthStr] = monthKey.split("-");
        const monthNum = parseInt(monthStr);
        const label = `${monthLabels[monthNum]}/${yearStr.slice(2)}`;
        return { monthKey, monthLabel: label, value };
      });
      grid.push({ day, cells });
    }

    if (globalMin === Infinity) globalMin = 0;

    return NextResponse.json({
      success: true,
      data: {
        grid,
        months: months.map((mk) => {
          const [yearStr, monthStr] = mk.split("-");
          const monthNum = parseInt(monthStr);
          return { key: mk, label: `${monthLabels[monthNum]}/${yearStr.slice(2)}` };
        }),
        globalMin,
        globalMax,
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/heatmap-month error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
