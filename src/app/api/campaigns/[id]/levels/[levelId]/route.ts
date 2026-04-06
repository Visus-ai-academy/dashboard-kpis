import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gamificationLevelUpdateSchema } from "@/lib/validators/gamification-level";
import { toNumber } from "@/lib/utils/prisma-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; levelId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      );
    }

    const { id: campaignId, levelId } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, companyId: session.user.companyId },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Campanha não encontrada" } },
        { status: 404 }
      );
    }

    const existing = await prisma.gamificationLevel.findFirst({
      where: { id: levelId, campaignId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Nível não encontrado" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = gamificationLevelUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados inválidos" } },
        { status: 400 }
      );
    }

    const level = await prisma.gamificationLevel.update({
      where: { id: levelId },
      data: parsed.data,
    });

    return NextResponse.json({
      success: true,
      data: { ...level, minPoints: toNumber(level.minPoints) },
    });
  } catch (error) {
    console.error("PUT /api/campaigns/[id]/levels/[levelId] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; levelId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      );
    }

    const { id: campaignId, levelId } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, companyId: session.user.companyId },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Campanha não encontrada" } },
        { status: 404 }
      );
    }

    const existing = await prisma.gamificationLevel.findFirst({
      where: { id: levelId, campaignId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Nível não encontrado" } },
        { status: 404 }
      );
    }

    await prisma.gamificationLevel.delete({ where: { id: levelId } });

    return NextResponse.json({ success: true, data: { id: levelId } });
  } catch (error) {
    console.error("DELETE /api/campaigns/[id]/levels/[levelId] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
