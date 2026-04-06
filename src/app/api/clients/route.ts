import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientCreateSchema } from "@/lib/validators/client";

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
    const unitId = searchParams.get("unitId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = { companyId: session.user.companyId };
    if (unitId) where.unitId = unitId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: clients });
  } catch (error) {
    console.error("GET /api/clients error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}

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
    const parsed = clientCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados inválidos" } },
        { status: 400 }
      );
    }

    // Sellers can only create clients with LEAD status
    const isSeller = session.user.role === "SELLER";
    const status = isSeller ? "CLIENT" : (parsed.data.status ?? "CLIENT");

    const client = await prisma.client.create({
      data: {
        companyId: session.user.companyId,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        status,
        unitId: parsed.data.unitId ?? null,
        entryDate: parsed.data.entryDate ? new Date(parsed.data.entryDate) : null,
        exitDate: parsed.data.exitDate ? new Date(parsed.data.exitDate) : null,
        exitReason: parsed.data.exitReason ?? null,
        notes: isSeller ? undefined : parsed.data.notes,
      },
    });

    return NextResponse.json({ success: true, data: client }, { status: 201 });
  } catch (error) {
    console.error("POST /api/clients error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
