import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils/prisma-helpers";
import { z } from "zod";

const entryAdminCreateSchema = z.object({
  kpiId: z.string().min(1, "KPI é obrigatório"),
  sellerId: z.string().min(1, "Vendedor é obrigatório"),
  clientId: z.string().optional().nullable(),
  value: z.number().min(0, "Valor deve ser maior ou igual a 0"),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  maturityLevel: z.enum(["INITIAL", "DEVELOPING", "MATURE", "CLOSING"]).optional().nullable(),
  temperature: z.enum(["COLD", "WARM", "HOT"]).optional().nullable(),
  scheduledDate: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

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
          client: { select: { name: true } },
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
      clientId: entry.clientId,
      clientName: entry.client?.name ?? null,
      value: toNumber(entry.value),
      entryDate: entry.entryDate.toISOString().split("T")[0],
      notes: entry.notes,
      maturityLevel: entry.maturityLevel,
      temperature: entry.temperature,
      scheduledDate: entry.scheduledDate?.toISOString().split("T")[0] ?? null,
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

// POST /api/entries
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
    const parsed = entryAdminCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados inválidos" } },
        { status: 400 }
      );
    }

    const entry = await prisma.entry.create({
      data: {
        companyId: session.user.companyId,
        kpiId: parsed.data.kpiId,
        sellerId: parsed.data.sellerId,
        clientId: parsed.data.clientId ?? null,
        value: parsed.data.value,
        entryDate: new Date(parsed.data.entryDate),
        maturityLevel: parsed.data.maturityLevel ?? null,
        temperature: parsed.data.temperature ?? null,
        scheduledDate: parsed.data.scheduledDate ? new Date(parsed.data.scheduledDate) : null,
        notes: parsed.data.notes ?? null,
      },
      include: {
        seller: { select: { name: true } },
        kpi: { select: { name: true, type: true } },
        client: { select: { name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: entry.id,
        kpiName: entry.kpi.name,
        kpiType: entry.kpi.type,
        sellerName: entry.seller.name,
        clientName: entry.client?.name ?? null,
        value: toNumber(entry.value),
        entryDate: entry.entryDate.toISOString().split("T")[0],
      },
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/entries error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}

// PUT /api/entries?id=xxx
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

    const existing = await prisma.entry.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Lançamento não encontrado" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = entryAdminCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados inválidos" } },
        { status: 400 }
      );
    }

    const entry = await prisma.entry.update({
      where: { id },
      data: {
        kpiId: parsed.data.kpiId,
        sellerId: parsed.data.sellerId,
        clientId: parsed.data.clientId ?? null,
        value: parsed.data.value,
        entryDate: new Date(parsed.data.entryDate),
        maturityLevel: parsed.data.maturityLevel ?? null,
        temperature: parsed.data.temperature ?? null,
        scheduledDate: parsed.data.scheduledDate ? new Date(parsed.data.scheduledDate) : null,
        notes: parsed.data.notes ?? null,
      },
      include: {
        seller: { select: { name: true } },
        kpi: { select: { name: true, type: true } },
        client: { select: { name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: entry.id,
        kpiName: entry.kpi.name,
        kpiType: entry.kpi.type,
        sellerName: entry.seller.name,
        clientName: entry.client?.name ?? null,
        value: toNumber(entry.value),
        entryDate: entry.entryDate.toISOString().split("T")[0],
      },
    });
  } catch (error) {
    console.error("PUT /api/entries error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}

// DELETE /api/entries?id=xxx
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

    const existing = await prisma.entry.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Lançamento não encontrado" } },
        { status: 404 }
      );
    }

    await prisma.entry.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/entries error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
