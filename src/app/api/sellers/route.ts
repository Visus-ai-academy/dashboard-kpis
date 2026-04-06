import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sellerCreateSchema } from "@/lib/validators/seller";
import { generateAccessCode } from "@/lib/utils/access-code";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

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
    const teamId = searchParams.get("teamId");
    const unitId = searchParams.get("unitId");

    const where: Record<string, unknown> = { companyId: session.user.companyId };
    if (teamId) where.teamId = teamId;
    if (unitId) {
      where.team = { sector: { unitId } };
    }

    const sellers = await prisma.seller.findMany({
      where,
      include: {
        team: {
          select: {
            name: true,
            sector: { select: { name: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: sellers });
  } catch (error) {
    console.error("GET /api/sellers error:", error);
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
    const parsed = sellerCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados invalidos" } },
        { status: 400 }
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

    const accessCode = generateAccessCode();
    const accessToken = randomUUID();
    const passwordHash = (body.password && typeof body.password === "string")
      ? await bcrypt.hash(body.password, 10)
      : null;

    const seller = await prisma.seller.create({
      data: {
        companyId: session.user.companyId,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        teamId: parsed.data.teamId,
        passwordHash,
        accessCode,
        accessToken,
      },
      include: {
        team: {
          select: {
            name: true,
            sector: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: seller }, { status: 201 });
  } catch (error) {
    console.error("POST /api/sellers error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
