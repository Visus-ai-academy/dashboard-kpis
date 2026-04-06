import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { seasonUpdateSchema } from "@/lib/validators/season";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; seasonId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      );
    }

    const { id: campaignId, seasonId } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, companyId: session.user.companyId },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Campanha não encontrada" } },
        { status: 404 }
      );
    }

    const existing = await prisma.season.findFirst({
      where: { id: seasonId, campaignId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Temporada não encontrada" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = seasonUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados inválidos" } },
        { status: 400 }
      );
    }

    const { startDate, endDate, ...rest } = parsed.data;

    const updateData: Record<string, unknown> = { ...rest };
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);

    const season = await prisma.season.update({
      where: { id: seasonId },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: season });
  } catch (error) {
    console.error("PUT /api/campaigns/[id]/seasons/[seasonId] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; seasonId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      );
    }

    const { id: campaignId, seasonId } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, companyId: session.user.companyId },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Campanha não encontrada" } },
        { status: 404 }
      );
    }

    const existing = await prisma.season.findFirst({
      where: { id: seasonId, campaignId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Temporada não encontrada" } },
        { status: 404 }
      );
    }

    await prisma.season.delete({ where: { id: seasonId } });

    return NextResponse.json({ success: true, data: { id: seasonId } });
  } catch (error) {
    console.error("DELETE /api/campaigns/[id]/seasons/[seasonId] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
