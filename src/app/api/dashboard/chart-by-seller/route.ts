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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const kpiId = searchParams.get("kpiId");
    const unitId = searchParams.get("unitId");

    if (!startDate || !endDate || !kpiId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "startDate, endDate e kpiId são obrigatórios" } },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const kpi = await prisma.kpi.findFirst({
      where: { id: kpiId, companyId: session.user.companyId, isActive: true },
      select: { id: true, name: true, type: true, chartType: true, targetValue: true },
    });

    if (!kpi) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "KPI não encontrado" } },
        { status: 404 }
      );
    }

    // Resolve unit filter to seller IDs
    const unitSellerIds = await getSellerIdsByUnit(session.user.companyId, unitId);

    // Build seller filter
    const sellerFilter = unitSellerIds
      ? { sellerId: { in: unitSellerIds } }
      : {};

    // Get all entries for this KPI grouped by seller
    const entries = await prisma.entry.findMany({
      where: {
        companyId: session.user.companyId,
        kpiId,
        entryDate: { gte: start, lte: end },
        ...sellerFilter,
      },
      include: {
        seller: { select: { id: true, name: true } },
      },
    });

    // Aggregate by seller
    const sellerMap = new Map<string, { name: string; total: number }>();
    for (const entry of entries) {
      const existing = sellerMap.get(entry.sellerId);
      if (existing) {
        existing.total += toNumber(entry.value);
      } else {
        sellerMap.set(entry.sellerId, {
          name: entry.seller.name,
          total: toNumber(entry.value),
        });
      }
    }

    const sellerData = Array.from(sellerMap.values())
      .map((s) => ({
        name: s.name,
        value: Math.round(s.total * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value);

    return NextResponse.json({
      success: true,
      data: {
        kpiId: kpi.id,
        kpiName: kpi.name,
        kpiType: kpi.type,
        targetValue: toNumber(kpi.targetValue),
        sellerData,
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/chart-by-seller error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
