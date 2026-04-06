import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { leadEntryCreateSchema } from "@/lib/validators/lead-entry";
import { toNumber } from "@/lib/utils/prisma-helpers";

// ────────────────────────────────────────────────────────────
// GET /api/lead-entries
// List lead entries with filters and pagination
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

    const companyId = session.user.companyId;
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sellerId = searchParams.get("sellerId");
    const status = searchParams.get("status");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { companyId };

    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) where.entryDate.gte = new Date(startDate);
      if (endDate) where.entryDate.lte = new Date(endDate + "T23:59:59.999Z");
    }

    if (sellerId) where.sellerId = sellerId;
    if (status === "QUALIFIED" || status === "DISQUALIFIED") where.status = status;

    const [total, rows] = await Promise.all([
      prisma.leadEntry.count({ where }),
      prisma.leadEntry.findMany({
        where,
        orderBy: { entryDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          sellerId: true,
          seller: { select: { name: true } },
          clientId: true,
          client: { select: { name: true } },
          status: true,
          entryDate: true,
          notes: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        sellerId: r.sellerId,
        sellerName: r.seller.name,
        clientId: r.clientId,
        clientName: r.client?.name ?? null,
        status: r.status,
        entryDate: r.entryDate.toISOString().split("T")[0],
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("GET /api/lead-entries error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────────────
// POST /api/lead-entries
// Create a new lead entry
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

    const companyId = session.user.companyId;
    const body = await request.json();
    const parsed = leadEntryCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Dados inválidos",
          },
        },
        { status: 400 }
      );
    }

    const { sellerId, clientId, clientName, status, entryDate, notes } = parsed.data;

    // Validate seller belongs to company
    const seller = await prisma.seller.findFirst({
      where: { id: sellerId, companyId },
    });
    if (!seller) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Vendedor não encontrado" } },
        { status: 400 }
      );
    }

    // Resolve clientId: if clientName is provided and no clientId, create a new client
    let resolvedClientId = clientId ?? null;
    if (!resolvedClientId && clientName?.trim()) {
      const newClient = await prisma.client.create({
        data: {
          companyId,
          name: clientName.trim(),
          status: "CLIENT",
        },
      });
      resolvedClientId = newClient.id;
    }

    // Validate clientId if provided
    if (resolvedClientId) {
      const client = await prisma.client.findFirst({
        where: { id: resolvedClientId, companyId },
      });
      if (!client) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "Cliente não encontrado" } },
          { status: 400 }
        );
      }
    }

    const leadEntry = await prisma.leadEntry.create({
      data: {
        companyId,
        sellerId,
        clientId: resolvedClientId,
        status,
        entryDate: new Date(entryDate),
        notes: notes ?? null,
      },
      select: {
        id: true,
        sellerId: true,
        seller: { select: { name: true } },
        clientId: true,
        client: { select: { name: true } },
        status: true,
        entryDate: true,
        notes: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: leadEntry.id,
          sellerId: leadEntry.sellerId,
          sellerName: leadEntry.seller.name,
          clientId: leadEntry.clientId,
          clientName: leadEntry.client?.name ?? null,
          status: leadEntry.status,
          entryDate: leadEntry.entryDate.toISOString().split("T")[0],
          notes: leadEntry.notes,
          createdAt: leadEntry.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/lead-entries error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────────────
// DELETE /api/lead-entries?id=...
// Delete a lead entry
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

    const companyId = session.user.companyId;
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "ID é obrigatório" } },
        { status: 400 }
      );
    }

    const existing = await prisma.leadEntry.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Registro não encontrado" } },
        { status: 404 }
      );
    }

    await prisma.leadEntry.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("DELETE /api/lead-entries error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
