import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unitCreateSchema } from "@/lib/validators/unit";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Nao autorizado" } },
        { status: 401 }
      );
    }

    const units = await prisma.unit.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: units });
  } catch (error) {
    console.error("GET /api/units error:", error);
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
    const parsed = unitCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados invalidos" } },
        { status: 400 }
      );
    }

    const unit = await prisma.unit.create({
      data: {
        companyId: session.user.companyId,
        name: parsed.data.name,
        isActive: parsed.data.isActive ?? true,
      },
    });

    return NextResponse.json({ success: true, data: unit }, { status: 201 });
  } catch (error) {
    console.error("POST /api/units error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
