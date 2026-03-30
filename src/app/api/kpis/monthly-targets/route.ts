import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { monthlyTargetBatchSchema } from "@/lib/validators/monthly-target";
import { toNumber } from "@/lib/utils/prisma-helpers";
import { z } from "zod";

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
    const year = searchParams.get("year");

    if (!year) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Ano é obrigatório" } },
        { status: 400 }
      );
    }

    const kpis = await prisma.kpi.findMany({
      where: { companyId: session.user.companyId },
      select: { id: true, name: true },
      orderBy: { displayOrder: "asc" },
    });

    const targets = await prisma.monthlyTarget.findMany({
      where: {
        year: parseInt(year),
        kpi: { companyId: session.user.companyId },
      },
      include: {
        seller: { select: { id: true, name: true } },
      },
    });

    const serialized = targets.map((t) => ({
      ...t,
      targetValue: toNumber(t.targetValue),
    }));

    return NextResponse.json({ success: true, data: { kpis, targets: serialized } });
  } catch (error) {
    console.error("GET /api/kpis/monthly-targets error:", error);
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
    const parsed = monthlyTargetBatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados invalidos" } },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const entry of parsed.data) {
        for (const target of entry.targets) {
          await tx.monthlyTarget.upsert({
            where: {
              kpiId_sellerId_month_year: {
                kpiId: entry.kpiId,
                sellerId: entry.sellerId ?? "",
                month: target.month,
                year: entry.year,
              },
            },
            update: {
              targetValue: target.targetValue,
            },
            create: {
              kpiId: entry.kpiId,
              sellerId: entry.sellerId,
              month: target.month,
              year: entry.year,
              targetValue: target.targetValue,
            },
          });
        }
      }
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error("POST /api/kpis/monthly-targets error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
