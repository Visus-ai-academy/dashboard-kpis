import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils/prisma-helpers";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      );
    }

    // Find first active campaign for this company
    const campaign = await prisma.campaign.findFirst({
      where: { companyId: session.user.companyId, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!campaign) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // Find active season
    const activeSeason = await prisma.season.findFirst({
      where: { campaignId: campaign.id, isActive: true },
    });

    if (!activeSeason) {
      return NextResponse.json({
        success: true,
        data: {
          campaign: { id: campaign.id, name: campaign.name },
          season: null,
          ranking: [],
          levels: [],
        },
      });
    }

    // Get levels
    const levels = await prisma.gamificationLevel.findMany({
      where: { campaignId: campaign.id },
      orderBy: { minPoints: "asc" },
    });

    // Get seller points for this season
    const sellerPoints = await prisma.sellerPoints.findMany({
      where: { campaignId: campaign.id, seasonId: activeSeason.id },
      include: {
        seller: { select: { id: true, name: true } },
      },
      orderBy: { totalPoints: "desc" },
    });

    const ranking = sellerPoints.map((sp, index) => {
      const points = toNumber(sp.totalPoints);

      let currentLevel = null;
      let nextLevel = null;
      for (let i = levels.length - 1; i >= 0; i--) {
        if (points >= toNumber(levels[i].minPoints)) {
          currentLevel = {
            name: levels[i].name,
            badgeEmoji: levels[i].badgeEmoji,
            minPoints: toNumber(levels[i].minPoints),
          };
          if (i < levels.length - 1) {
            nextLevel = {
              name: levels[i + 1].name,
              minPoints: toNumber(levels[i + 1].minPoints),
            };
          }
          break;
        }
      }

      return {
        position: index + 1,
        sellerId: sp.seller.id,
        sellerName: sp.seller.name,
        totalPoints: points,
        currentLevel,
        nextLevel,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        campaign: { id: campaign.id, name: campaign.name },
        season: { id: activeSeason.id, name: activeSeason.name },
        ranking,
        levels: levels.map((l) => ({
          ...l,
          minPoints: toNumber(l.minPoints),
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/gamification-ranking error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
