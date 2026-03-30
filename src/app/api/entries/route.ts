import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils/prisma-helpers";

// ────────────────────────────────────────────────────────────
// GET /api/entries?startDate&endDate&sellerId&kpiId&page&pageSize
// ────────────────────────────────────────────────────────────

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
    const sellerId = searchParams.get("sellerId");
    const kpiId = searchParams.get("kpiId");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));

    const where: Record<string, unknown> = {
      companyId: session.user.companyId,
    };

    if (startDate) {
      where.entryDate = { ...(where.entryDate as object ?? {}), gte: new Date(startDate) };
    }
    if (endDate) {
      where.entryDate = { ...(where.entryDate as object ?? {}), lte: new Date(endDate + "T23:59:59.999Z") };
    }
    if (sellerId) {
      where.sellerId = sellerId;
    }
    if (kpiId) {
      where.kpiId = kpiId;
    }

    const [entries, total] = await Promise.all([
      prisma.entry.findMany({
        where,
        include: {
          seller: { select: { name: true } },
          kpi: { select: { name: true, type: true } },
        },
        orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.entry.count({ where }),
    ]);

    const serialized = entries.map((entry) => ({
      id: entry.id,
      kpiId: entry.kpiId,
      kpiName: entry.kpi.name,
      kpiType: entry.kpi.type,
      sellerId: entry.sellerId,
      sellerName: entry.seller.name,
      value: toNumber(entry.value),
      entryDate: entry.entryDate.toISOString().split("T")[0],
      notes: entry.notes,
      createdAt: entry.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        entries: serialized,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error) {
    console.error("GET /api/entries error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
