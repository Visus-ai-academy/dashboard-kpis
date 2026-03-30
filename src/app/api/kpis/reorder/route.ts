import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const reorderSchema = z.object({
  id: z.string().uuid(),
  direction: z.enum(["up", "down"]),
});

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
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados invalidos" } },
        { status: 400 }
      );
    }

    const { id, direction } = parsed.data;

    const kpis = await prisma.kpi.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { displayOrder: "asc" },
      select: { id: true, displayOrder: true },
    });

    const currentIndex = kpis.findIndex((k) => k.id === id);
    if (currentIndex === -1) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "KPI nao encontrado" } },
        { status: 404 }
      );
    }

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= kpis.length) {
      return NextResponse.json({ success: true, data: null });
    }

    const current = kpis[currentIndex];
    const swap = kpis[swapIndex];

    await prisma.$transaction([
      prisma.kpi.update({
        where: { id: current.id },
        data: { displayOrder: swap.displayOrder },
      }),
      prisma.kpi.update({
        where: { id: swap.id },
        data: { displayOrder: current.displayOrder },
      }),
    ]);

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error("POST /api/kpis/reorder error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
