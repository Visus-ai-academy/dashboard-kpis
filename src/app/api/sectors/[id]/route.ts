import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sectorUpdateSchema } from "@/lib/validators/sector";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Nao autorizado" } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = sectorUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados invalidos" } },
        { status: 400 }
      );
    }

    const existing = await prisma.sector.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Setor nao encontrado" } },
        { status: 404 }
      );
    }

    if (parsed.data.unitId) {
      const unit = await prisma.unit.findFirst({
        where: { id: parsed.data.unitId, companyId: session.user.companyId },
      });
      if (!unit) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Unidade nao encontrada" } },
          { status: 404 }
        );
      }
    }

    const sector = await prisma.sector.update({
      where: { id },
      data: parsed.data,
      include: { unit: { select: { name: true } } },
    });

    return NextResponse.json({ success: true, data: sector });
  } catch (error) {
    console.error("PUT /api/sectors/[id] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Nao autorizado" } },
        { status: 401 }
      );
    }

    const { id } = await params;

    const existing = await prisma.sector.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Setor nao encontrado" } },
        { status: 404 }
      );
    }

    await prisma.sector.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("DELETE /api/sectors/[id] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
