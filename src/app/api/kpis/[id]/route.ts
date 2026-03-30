import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { kpiUpdateSchema } from "@/lib/validators/kpi";
import { toNumber } from "@/lib/utils/prisma-helpers";

export async function PUT(
  request: NextRequest,
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
    const body = await request.json();
    const parsed = kpiUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados invalidos" } },
        { status: 400 }
      );
    }

    const existing = await prisma.kpi.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "KPI nao encontrado" } },
        { status: 404 }
      );
    }

    const { sectorIds, sellerIds, ...kpiData } = parsed.data;

    const kpi = await prisma.$transaction(async (tx) => {
      await tx.kpi.update({
        where: { id },
        data: kpiData,
      });

      if (sectorIds !== undefined) {
        await tx.kpiSector.deleteMany({ where: { kpiId: id } });
        if (sectorIds.length > 0) {
          await tx.kpiSector.createMany({
            data: sectorIds.map((sectorId) => ({
              kpiId: id,
              sectorId,
            })),
          });
        }
      }

      if (sellerIds !== undefined) {
        await tx.kpiSeller.deleteMany({ where: { kpiId: id } });
        if (sellerIds.length > 0) {
          await tx.kpiSeller.createMany({
            data: sellerIds.map((sellerId) => ({
              kpiId: id,
              sellerId,
            })),
          });
        }
      }

      return tx.kpi.findUnique({
        where: { id },
        include: {
          kpiSectors: { include: { sector: { select: { name: true } } } },
          kpiSellers: { include: { seller: { select: { name: true } } } },
        },
      });
    });

    if (!kpi) {
      return NextResponse.json(
        { success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao atualizar KPI" } },
        { status: 500 }
      );
    }

    const serialized = {
      ...kpi,
      targetValue: toNumber(kpi.targetValue),
      kpiSellers: kpi.kpiSellers.map((ks) => ({
        ...ks,
        customTarget: ks.customTarget ? toNumber(ks.customTarget) : null,
      })),
    };

    return NextResponse.json({ success: true, data: serialized });
  } catch (error) {
    console.error("PUT /api/kpis/[id] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const existing = await prisma.kpi.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "KPI nao encontrado" } },
        { status: 404 }
      );
    }

    await prisma.kpi.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("DELETE /api/kpis/[id] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
