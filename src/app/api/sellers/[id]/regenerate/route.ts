import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAccessCode } from "@/lib/utils/access-code";

export async function POST(
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

    const newAccessCode = generateAccessCode();

    const seller = await prisma.seller.update({
      where: { id },
      data: { accessCode: newAccessCode },
      select: { id: true, accessCode: true },
    });

    return NextResponse.json({ success: true, data: seller });
  } catch (error) {
    console.error("POST /api/sellers/[id]/regenerate error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
