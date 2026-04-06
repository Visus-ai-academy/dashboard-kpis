import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils/prisma-helpers";
import { z } from "zod";

const saleCreateSchema = z.object({
  sellerId: z.string().min(1, "Vendedor é obrigatório"),
  clientId: z.string().min(1, "Cliente é obrigatório").optional().nullable(),
  amount: z.number().min(0.01, "Valor deve ser maior que zero"),
  expectedVolume: z.number().int().min(0).optional().nullable(),
  volumeUnit: z.string().max(50).optional().nullable(),
  saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
});

// ────────────────────────────────────────────────────────────
// GET /api/sales?startDate&endDate&sellerId&page&pageSize
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
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));

    const where: Record<string, unknown> = {
      companyId: session.user.companyId,
    };

    if (startDate) {
      where.saleDate = { ...(where.saleDate as object ?? {}), gte: new Date(startDate) };
    }
    if (endDate) {
      where.saleDate = { ...(where.saleDate as object ?? {}), lte: new Date(endDate + "T23:59:59.999Z") };
    }
    if (sellerId) {
      where.sellerId = sellerId;
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          seller: { select: { name: true } },
          client: { select: { name: true } },
        },
        orderBy: [{ saleDate: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.sale.count({ where }),
    ]);

    const serialized = sales.map((sale) => ({
      id: sale.id,
      sellerId: sale.sellerId,
      sellerName: sale.seller.name,
      clientId: sale.clientId,
      clientName: sale.client?.name ?? null,
      amount: toNumber(sale.amount),
      expectedVolume: sale.expectedVolume,
      volumeUnit: sale.volumeUnit,
      saleDate: sale.saleDate.toISOString().split("T")[0],
      createdAt: sale.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        sales: serialized,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error) {
    console.error("GET /api/sales error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────────────
// POST /api/sales
// ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = saleCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados inválidos" } },
        { status: 400 }
      );
    }

    // Verify seller belongs to company
    const seller = await prisma.seller.findFirst({
      where: { id: parsed.data.sellerId, companyId: session.user.companyId },
    });
    if (!seller) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Vendedor não encontrado" } },
        { status: 404 }
      );
    }

    const sale = await prisma.sale.create({
      data: {
        companyId: session.user.companyId,
        sellerId: parsed.data.sellerId,
        clientId: parsed.data.clientId ?? null,
        amount: parsed.data.amount,
        expectedVolume: parsed.data.expectedVolume ?? null,
        volumeUnit: parsed.data.volumeUnit ?? null,
        saleDate: new Date(parsed.data.saleDate),
      },
      include: {
        seller: { select: { name: true } },
        client: { select: { name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: sale.id,
        sellerId: sale.sellerId,
        sellerName: sale.seller.name,
        clientName: sale.client?.name ?? null,
        amount: toNumber(sale.amount),
        expectedVolume: sale.expectedVolume,
        volumeUnit: sale.volumeUnit,
        saleDate: sale.saleDate.toISOString().split("T")[0],
        createdAt: sale.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/sales error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────────────
// PUT /api/sales?id=xxx
// ────────────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "ID é obrigatório" } },
        { status: 400 }
      );
    }

    const existing = await prisma.sale.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Venda não encontrada" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = saleCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados inválidos" } },
        { status: 400 }
      );
    }

    const sale = await prisma.sale.update({
      where: { id },
      data: {
        sellerId: parsed.data.sellerId,
        clientId: parsed.data.clientId ?? null,
        amount: parsed.data.amount,
        expectedVolume: parsed.data.expectedVolume ?? null,
        volumeUnit: parsed.data.volumeUnit ?? null,
        saleDate: new Date(parsed.data.saleDate),
      },
      include: {
        seller: { select: { name: true } },
        client: { select: { name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: sale.id,
        sellerId: sale.sellerId,
        sellerName: sale.seller.name,
        clientName: sale.client?.name ?? null,
        amount: toNumber(sale.amount),
        expectedVolume: sale.expectedVolume,
        volumeUnit: sale.volumeUnit,
        saleDate: sale.saleDate.toISOString().split("T")[0],
        createdAt: sale.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("PUT /api/sales error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────────────
// DELETE /api/sales?id=xxx
// ────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "ID é obrigatório" } },
        { status: 400 }
      );
    }

    const existing = await prisma.sale.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Venda não encontrada" } },
        { status: 404 }
      );
    }

    await prisma.sale.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/sales error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
