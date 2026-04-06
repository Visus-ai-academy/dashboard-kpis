import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils/prisma-helpers";
import { getSellerIdsByUnit } from "@/lib/queries/unit-sellers";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const sellerId = searchParams.get("sellerId");
    const unitId = searchParams.get("unitId");

    const now = new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = endDateParam
      ? new Date(endDateParam + "T23:59:59.999Z")
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const companyId = session.user.companyId;

    // Resolve unit filter to seller IDs
    const unitSellerIds = await getSellerIdsByUnit(companyId, unitId);

    // Build seller filter
    const sellerFilter = sellerId
      ? { sellerId }
      : unitSellerIds
        ? { sellerId: { in: unitSellerIds } }
        : {};

    // --- Average Ticket ---
    const salesWhere = {
      companyId,
      saleDate: { gte: startDate, lte: endDate },
      ...sellerFilter,
    };

    const [salesAgg, salesCount] = await Promise.all([
      prisma.sale.aggregate({
        where: salesWhere,
        _sum: { amount: true },
      }),
      prisma.sale.count({ where: salesWhere }),
    ]);

    const totalSalesAmount = toNumber(salesAgg._sum.amount);
    const averageTicket = salesCount > 0
      ? Math.round((totalSalesAmount / salesCount) * 100) / 100
      : 0;

    // --- Conversão SDR: Reuniões Agendadas / Ligações Realizadas ---
    const [ligacoesKpi, reunioesKpi] = await Promise.all([
      prisma.kpi.findFirst({
        where: { companyId, isActive: true, name: { contains: "Liga", mode: "insensitive" } },
      }),
      prisma.kpi.findFirst({
        where: { companyId, isActive: true, name: { contains: "Reuni", mode: "insensitive" } },
      }),
    ]);

    let conversionSDR = 0;
    let ligacoesTotal = 0;
    let reunioesTotal = 0;
    let hasConversionData = false;

    if (ligacoesKpi && reunioesKpi) {
      const [ligacoesAgg, reunioesAgg] = await Promise.all([
        prisma.entry.aggregate({
          where: {
            companyId,
            kpiId: ligacoesKpi.id,
            entryDate: { gte: startDate, lte: endDate },
            ...sellerFilter,
          },
          _sum: { value: true },
        }),
        prisma.entry.aggregate({
          where: {
            companyId,
            kpiId: reunioesKpi.id,
            entryDate: { gte: startDate, lte: endDate },
            ...sellerFilter,
          },
          _sum: { value: true },
        }),
      ]);

      ligacoesTotal = toNumber(ligacoesAgg._sum.value);
      reunioesTotal = toNumber(reunioesAgg._sum.value);

      if (ligacoesTotal > 0) {
        conversionSDR = Math.round((reunioesTotal / ligacoesTotal) * 1000) / 10;
        hasConversionData = true;
      }
    }

    // --- Conversão Leads: Total Lead Entries / Reuniões ---
    let conversionLeads = 0;
    let totalLeadEntries = 0;
    let hasLeadConversionData = false;

    const leadEntriesWhere = {
      companyId,
      entryDate: { gte: startDate, lte: endDate },
      ...sellerFilter,
    };

    totalLeadEntries = await prisma.leadEntry.count({
      where: leadEntriesWhere,
    });

    if (reunioesKpi && reunioesTotal > 0 && totalLeadEntries > 0) {
      conversionLeads = Math.round((reunioesTotal / totalLeadEntries) * 1000) / 10;
      hasLeadConversionData = true;
    }

    const derivedKpis = [
      {
        id: "derived-average-ticket",
        name: "Ticket Médio",
        type: "MONETARY",
        value: averageTicket,
        description: `${salesCount} vendas no período`,
      },
    ];

    if (hasConversionData) {
      derivedKpis.push({
        id: "derived-conversion-sdr",
        name: "Conversão SDR",
        type: "PERCENTAGE",
        value: conversionSDR,
        description: `${reunioesTotal} reuniões / ${ligacoesTotal} ligações`,
      });
    }

    if (hasLeadConversionData) {
      derivedKpis.push({
        id: "derived-conversion-leads",
        name: "Conversão Leads",
        type: "PERCENTAGE",
        value: conversionLeads,
        description: `${reunioesTotal} reuniões / ${totalLeadEntries} leads`,
      });
    }

    // --- Conversão Atendimento: Ligações Atendidas / Ligações Realizadas ---
    const atendidasKpi = await prisma.kpi.findFirst({
      where: { companyId, isActive: true, name: { contains: "Atendida", mode: "insensitive" } },
    });

    if (atendidasKpi && ligacoesKpi && ligacoesTotal > 0) {
      const atendidasAgg = await prisma.entry.aggregate({
        where: {
          companyId,
          kpiId: atendidasKpi.id,
          entryDate: { gte: startDate, lte: endDate },
          ...sellerFilter,
        },
        _sum: { value: true },
      });
      const atendidasTotal = toNumber(atendidasAgg._sum.value);

      if (atendidasTotal > 0) {
        const conversionAtendimento = Math.round((atendidasTotal / ligacoesTotal) * 1000) / 10;
        derivedKpis.push({
          id: "derived-conversion-atendimento",
          name: "Taxa de Atendimento",
          type: "PERCENTAGE",
          value: conversionAtendimento,
          description: `${atendidasTotal} atendidas / ${ligacoesTotal} realizadas`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { derivedKpis },
    });
  } catch (error) {
    console.error("GET /api/dashboard/derived-kpis error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
