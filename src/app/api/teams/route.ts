import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { teamCreateSchema } from "@/lib/validators/team";

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
    const sectorId = searchParams.get("sectorId");
    const unitId = searchParams.get("unitId");

    const where: Record<string, unknown> = { companyId: session.user.companyId };
    if (sectorId) where.sectorId = sectorId;
    if (unitId) where.sector = { unitId };

    const teams = await prisma.team.findMany({
      where,
      include: { sector: { select: { name: true } } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: teams });
  } catch (error) {
    console.error("GET /api/teams error:", error);
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
    const parsed = teamCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados invalidos" } },
        { status: 400 }
      );
    }

    // Verify sector belongs to same company
    const sector = await prisma.sector.findFirst({
      where: { id: parsed.data.sectorId, companyId: session.user.companyId },
    });

    if (!sector) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Setor nao encontrado" } },
        { status: 404 }
      );
    }

    const team = await prisma.team.create({
      data: {
        companyId: session.user.companyId,
        sectorId: parsed.data.sectorId,
        name: parsed.data.name,
        isActive: parsed.data.isActive ?? true,
      },
      include: { sector: { select: { name: true } } },
    });

    return NextResponse.json({ success: true, data: team }, { status: 201 });
  } catch (error) {
    console.error("POST /api/teams error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
