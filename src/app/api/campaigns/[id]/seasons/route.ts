import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { seasonCreateSchema } from "@/lib/validators/season";

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

    const seasons = await prisma.season.findMany({
      where: { campaignId },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json({ success: true, data: seasons });
  } catch (error) {
    console.error("GET /api/campaigns/[id]/seasons error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const parsed = seasonCreateSchema.safeParse({ ...body, campaignId });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados inválidos" } },
        { status: 400 }
      );
    }

    const { startDate, endDate, ...rest } = parsed.data;

    const season = await prisma.season.create({
      data: {
        ...rest,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    return NextResponse.json({ success: true, data: season }, { status: 201 });
  } catch (error) {
    console.error("POST /api/campaigns/[id]/seasons error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
