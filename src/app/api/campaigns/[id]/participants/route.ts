import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const { id: campaignId } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, companyId: session.user.companyId },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Campanha não encontrada" } },
        { status: 404 }
      );
    }

    // Get all sellers from the company
    const sellers = await prisma.seller.findMany({
      where: { companyId: session.user.companyId, isActive: true },
      select: { id: true, name: true, email: true, team: { select: { name: true } } },
      orderBy: { name: "asc" },
    });

    // Get current participants
    const participants = await prisma.campaignParticipant.findMany({
      where: { campaignId },
      select: { sellerId: true },
    });

    const participantIds = new Set(participants.map((p) => p.sellerId));

    const data = sellers.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      teamName: s.team?.name ?? null,
      isParticipant: participantIds.has(s.id),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET /api/campaigns/[id]/participants error:", error);
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

    const { id: campaignId } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, companyId: session.user.companyId },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Campanha não encontrada" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { sellerIds } = body as { sellerIds: string[] };

    if (!Array.isArray(sellerIds)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "sellerIds deve ser um array" } },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Remove all current participants
      await tx.campaignParticipant.deleteMany({
        where: { campaignId },
      });

      // Add new participants
      if (sellerIds.length > 0) {
        await tx.campaignParticipant.createMany({
          data: sellerIds.map((sellerId) => ({
            campaignId,
            sellerId,
          })),
        });
      }
    });

    return NextResponse.json({ success: true, data: { count: sellerIds.length } });
  } catch (error) {
    console.error("PUT /api/campaigns/[id]/participants error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
