import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sectorCreateSchema } from "@/lib/validators/sector";

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
    const unitId = searchParams.get("unitId");

    const where: Record<string, unknown> = { companyId: session.user.companyId };
    if (unitId) where.unitId = unitId;

    const sectors = await prisma.sector.findMany({
      where,
      include: { unit: { select: { name: true } } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: sectors });
  } catch (error) {
    console.error("GET /api/sectors error:", error);
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
        { success: false, error: { code: "UNAUTHORIZED", message: "Nao autorizado" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = sectorCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados invalidos" } },
        { status: 400 }
      );
    }

    // Verify unit belongs to same company
    const unit = await prisma.unit.findFirst({
      where: { id: parsed.data.unitId, companyId: session.user.companyId },
    });

    if (!unit) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Unidade nao encontrada" } },
        { status: 404 }
      );
    }

    const sector = await prisma.sector.create({
      data: {
        companyId: session.user.companyId,
        unitId: parsed.data.unitId,
        name: parsed.data.name,
        isActive: parsed.data.isActive ?? true,
      },
      include: { unit: { select: { name: true } } },
    });

    return NextResponse.json({ success: true, data: sector }, { status: 201 });
  } catch (error) {
    console.error("POST /api/sectors error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
