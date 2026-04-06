import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sellerUpdateSchema } from "@/lib/validators/seller";
import bcrypt from "bcryptjs";

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
    const parsed = sellerUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados invalidos" } },
        { status: 400 }
      );
    }

    const existing = await prisma.seller.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Vendedor nao encontrado" } },
        { status: 404 }
      );
    }

    if (parsed.data.teamId) {
      const team = await prisma.team.findFirst({
        where: { id: parsed.data.teamId, companyId: session.user.companyId },
      });
      if (!team) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Equipe nao encontrada" } },
          { status: 404 }
        );
      }
    }

    const updateData: Record<string, unknown> = { ...parsed.data };

    // Hash password if provided
    if (body.password && typeof body.password === "string" && body.password.trim()) {
      updateData.passwordHash = await bcrypt.hash(body.password.trim(), 10);
    }
    delete updateData.password;

    const seller = await prisma.seller.update({
      where: { id },
      data: updateData,
      include: {
        team: {
          select: {
            name: true,
            sector: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: seller });
  } catch (error) {
    console.error("PUT /api/sellers/[id] error:", error);
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

    const existing = await prisma.seller.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Vendedor nao encontrado" } },
        { status: 404 }
      );
    }

    await prisma.seller.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("DELETE /api/sellers/[id] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
