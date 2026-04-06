import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { campaignCreateSchema } from "@/lib/validators/campaign";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      );
    }

    const campaigns = await prisma.campaign.findMany({
      where: { companyId: session.user.companyId },
      include: {
        _count: {
          select: { participants: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const serialized = campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      isActive: c.isActive,
      gamificationEnabled: c.gamificationEnabled,
      seasonType: c.seasonType,
      resetPointsOnEnd: c.resetPointsOnEnd,
      teamMode: c.teamMode,
      participantsCount: c._count.participants,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return NextResponse.json({ success: true, data: serialized });
  } catch (error) {
    console.error("GET /api/campaigns error:", error);
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
    const parsed = campaignCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados inválidos" } },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        companyId: session.user.companyId,
        ...parsed.data,
      },
      include: {
        _count: {
          select: { participants: true },
        },
      },
    });

    const serialized = {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      isActive: campaign.isActive,
      gamificationEnabled: campaign.gamificationEnabled,
      seasonType: campaign.seasonType,
      resetPointsOnEnd: campaign.resetPointsOnEnd,
      teamMode: campaign.teamMode,
      participantsCount: campaign._count.participants,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };

    return NextResponse.json({ success: true, data: serialized }, { status: 201 });
  } catch (error) {
    console.error("POST /api/campaigns error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
