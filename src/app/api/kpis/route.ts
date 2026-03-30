import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { kpiCreateSchema } from "@/lib/validators/kpi";
import { toNumber } from "@/lib/utils/prisma-helpers";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Nao autorizado" } },
        { status: 401 }
      );
    }

    const kpis = await prisma.kpi.findMany({
      where: { companyId: session.user.companyId },
      include: {
        kpiSectors: { include: { sector: { select: { name: true } } } },
        kpiSellers: { include: { seller: { select: { name: true } } } },
      },
      orderBy: { displayOrder: "asc" },
    });

    const serialized = kpis.map((kpi) => ({
      ...kpi,
      targetValue: toNumber(kpi.targetValue),
      kpiSellers: kpi.kpiSellers.map((ks) => ({
        ...ks,
        customTarget: ks.customTarget ? toNumber(ks.customTarget) : null,
      })),
    }));

    return NextResponse.json({ success: true, data: serialized });
  } catch (error) {
    console.error("GET /api/kpis error:", error);
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
    const parsed = kpiCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados invalidos" } },
        { status: 400 }
      );
    }

    const { sectorIds, sellerIds, ...kpiData } = parsed.data;

    // Get next display order
    const maxOrder = await prisma.kpi.aggregate({
      where: { companyId: session.user.companyId },
      _max: { displayOrder: true },
    });
    const nextOrder = (maxOrder._max.displayOrder ?? -1) + 1;

    const kpi = await prisma.$transaction(async (tx) => {
      const created = await tx.kpi.create({
        data: {
          companyId: session.user.companyId,
          ...kpiData,
          displayOrder: nextOrder,
        },
      });

      if (sectorIds && sectorIds.length > 0) {
        await tx.kpiSector.createMany({
          data: sectorIds.map((sectorId) => ({
            kpiId: created.id,
            sectorId,
          })),
        });
      }

      if (sellerIds && sellerIds.length > 0) {
        await tx.kpiSeller.createMany({
          data: sellerIds.map((sellerId) => ({
            kpiId: created.id,
            sellerId,
          })),
        });
      }

      return tx.kpi.findUnique({
        where: { id: created.id },
        include: {
          kpiSectors: { include: { sector: { select: { name: true } } } },
          kpiSellers: { include: { seller: { select: { name: true } } } },
        },
      });
    });

    if (!kpi) {
      return NextResponse.json(
        { success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao criar KPI" } },
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

    return NextResponse.json({ success: true, data: serialized }, { status: 201 });
  } catch (error) {
    console.error("POST /api/kpis error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
