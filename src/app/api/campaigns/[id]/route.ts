import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { campaignUpdateSchema } from "@/lib/validators/campaign";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      );
    }

    const { id } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, companyId: session.user.companyId },
      include: {
        _count: {
          select: { participants: true, scoringRules: true, seasons: true, levels: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Campanha não encontrada" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        isActive: campaign.isActive,
        gamificationEnabled: campaign.gamificationEnabled,
        seasonType: campaign.seasonType,
        resetPointsOnEnd: campaign.resetPointsOnEnd,
        teamMode: campaign.teamMode,
        participantsCount: campaign._count.participants,
        scoringRulesCount: campaign._count.scoringRules,
        seasonsCount: campaign._count.seasons,
        levelsCount: campaign._count.levels,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      },
    });
  } catch (error) {
    console.error("GET /api/campaigns/[id] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = campaignUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados inválidos" } },
        { status: 400 }
      );
    }

    const existing = await prisma.campaign.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Campanha não encontrada" } },
        { status: 404 }
      );
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    console.error("PUT /api/campaigns/[id] error:", error);
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
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      );
    }

    const { id } = await params;

    const existing = await prisma.campaign.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Campanha não encontrada" } },
        { status: 404 }
      );
    }

    await prisma.campaign.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("DELETE /api/campaigns/[id] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
