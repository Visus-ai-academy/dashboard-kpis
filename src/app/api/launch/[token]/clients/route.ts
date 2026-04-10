import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ────────────────────────────────────────────────────────────
// GET /api/launch/[token]/clients
// List active clients for the seller's company (token-based)
// ────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const seller = await prisma.seller.findUnique({
      where: { accessToken: token },
      select: {
        id: true,
        companyId: true,
        isActive: true,
        email: true,
        accessCode: true,
      },
    });

    if (!seller || !seller.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Link inválido ou vendedor inativo" },
        },
        { status: 404 }
      );
    }

    // No authentication required — link access is sufficient

    const clients = await prisma.client.findMany({
      where: {
        companyId: seller.companyId,
        status: { not: "INACTIVE" },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, status: true },
    });

    return NextResponse.json({ success: true, data: clients });
  } catch (error) {
    console.error("GET /api/launch/[token]/clients error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" },
      },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────────────
// POST /api/launch/[token]/clients
// Create a client for the seller (token-based, no session)
// ────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const seller = await prisma.seller.findUnique({
      where: { accessToken: token },
      select: {
        id: true,
        companyId: true,
        isActive: true,
        email: true,
        accessCode: true,
      },
    });

    if (!seller || !seller.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Link inválido ou vendedor inativo" },
        },
        { status: 404 }
      );
    }

    // No authentication required — link access is sufficient

    const body = await request.json();

    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Nome do cliente é obrigatório" },
        },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        companyId: seller.companyId,
        name: body.name.trim(),
        email: body.email?.trim() || undefined,
        phone: body.phone?.trim() || undefined,
        status: "CLIENT",
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: { id: client.id, name: client.name, status: client.status },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/launch/[token]/clients error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" },
      },
      { status: 500 }
    );
  }
}
