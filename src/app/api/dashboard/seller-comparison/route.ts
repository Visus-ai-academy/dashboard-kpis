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

    const unitId = searchParams.get("unitId");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "startDate e endDate sao obrigatorios" } },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Resolve unit filter to seller IDs
    const unitSellerIds = await getSellerIdsByUnit(session.user.companyId, unitId);

    // Get all active sellers (filtered by unit if applicable)
    const sellers = await prisma.seller.findMany({
      where: {
        companyId: session.user.companyId,
        isActive: true,
        ...(unitSellerIds ? { id: { in: unitSellerIds } } : {}),
      },
      orderBy: { name: "asc" },
    });

    // Build seller filter
    const sellerFilter = unitSellerIds
      ? { sellerId: { in: unitSellerIds } }
      : {};

    // Get sales for the period
    const sales = await prisma.sale.findMany({
      where: {
        companyId: session.user.companyId,
        saleDate: { gte: start, lte: end },
        ...sellerFilter,
      },
    });

    // Build seller comparison
    const sellerData = sellers.map((seller) => {
      const sellerSales = sales.filter((s) => s.sellerId === seller.id);
      const totalSales = sellerSales.reduce((sum, s) => sum + toNumber(s.amount), 0);
      const saleCount = sellerSales.length;
      const averageTicket = saleCount > 0 ? totalSales / saleCount : 0;

      return {
        sellerId: seller.id,
        sellerName: seller.name,
        totalSales,
        saleCount,
        averageTicket: Math.round(averageTicket * 100) / 100,
      };
    });

    // Calculate company average
    const totalCompanySales = sales.reduce((sum, s) => sum + toNumber(s.amount), 0);
    const totalCompanySaleCount = sales.length;
    const companyAverageTicket = totalCompanySaleCount > 0
      ? totalCompanySales / totalCompanySaleCount
      : 0;

    // Add percentage vs average and sort by total sales
    const comparison = sellerData
      .map((seller) => {
        const percentVsAverage = companyAverageTicket > 0
          ? ((seller.averageTicket - companyAverageTicket) / companyAverageTicket) * 100
          : 0;

        return {
          ...seller,
          percentVsAverage: Math.round(percentVsAverage * 10) / 10,
        };
      })
      .sort((a, b) => b.totalSales - a.totalSales);

    return NextResponse.json({
      success: true,
      data: {
        comparison,
        companyAverageTicket: Math.round(companyAverageTicket * 100) / 100,
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/seller-comparison error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
