import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function generateAccessCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("🌱 Gerando dados de demonstração...\n");

  // ═══════════════════════════════════════════════════════════
  // LIMPAR TUDO
  // ═══════════════════════════════════════════════════════════
  console.log("🗑️  Limpando banco de dados...");
  await prisma.sellerPoints.deleteMany();
  await prisma.campaignParticipant.deleteMany();
  await prisma.gamificationLevel.deleteMany();
  await prisma.scoringRule.deleteMany();
  await prisma.season.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.leadEntry.deleteMany();
  await prisma.entry.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.entrySchedule.deleteMany();
  await prisma.monthlyTarget.deleteMany();
  await prisma.kpiSeller.deleteMany();
  await prisma.kpiSector.deleteMany();
  await prisma.nonWorkingDay.deleteMany();
  await prisma.client.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.team.deleteMany();
  await prisma.sector.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.kpi.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
  console.log("   ✅ Banco limpo\n");

  // ═══════════════════════════════════════════════════════════
  // EMPRESA & GESTOR
  // ═══════════════════════════════════════════════════════════
  const company = await prisma.company.create({
    data: { name: "Visus Dash", slug: "visus-dash" },
  });

  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.create({
    data: {
      companyId: company.id,
      email: "admin@visus.com",
      passwordHash,
      name: "Gestor Visus",
      role: "ADMIN",
    },
  });
  console.log("🏢 Empresa: Visus Dash");
  console.log("👤 Gestor: admin@visus.com / admin123\n");

  // ═══════════════════════════════════════════════════════════
  // ESTRUTURA ORGANIZACIONAL
  // ═══════════════════════════════════════════════════════════
  const unitMatriz = await prisma.unit.create({
    data: { companyId: company.id, name: "Matriz São Paulo" },
  });
  const unitFilial = await prisma.unit.create({
    data: { companyId: company.id, name: "Filial Rio de Janeiro" },
  });

  const sectorSDR = await prisma.sector.create({
    data: { companyId: company.id, unitId: unitMatriz.id, name: "SDR" },
  });
  const sectorCloser = await prisma.sector.create({
    data: { companyId: company.id, unitId: unitMatriz.id, name: "Closer" },
  });
  const sectorVarejo = await prisma.sector.create({
    data: { companyId: company.id, unitId: unitFilial.id, name: "Varejo" },
  });

  const teamSDR = await prisma.team.create({
    data: { companyId: company.id, sectorId: sectorSDR.id, name: "SDR Alpha" },
  });
  const teamCloser = await prisma.team.create({
    data: { companyId: company.id, sectorId: sectorCloser.id, name: "Closer Prime" },
  });
  const teamVarejo = await prisma.team.create({
    data: { companyId: company.id, sectorId: sectorVarejo.id, name: "Varejo Elite" },
  });

  console.log("🏗️  Estrutura: 2 unidades, 3 setores, 3 equipes");

  // ═══════════════════════════════════════════════════════════
  // USUÁRIOS (VENDEDORES)
  // ═══════════════════════════════════════════════════════════
  const sellerData = [
    { name: "Ana Clara Silva", email: "ana.silva@visus.com", phone: "(11) 99801-1234", teamId: teamSDR.id },
    { name: "Bruno Costa", email: "bruno.costa@visus.com", phone: "(11) 99802-2345", teamId: teamSDR.id },
    { name: "Camila Rodrigues", email: "camila.rodrigues@visus.com", phone: "(11) 99803-3456", teamId: teamCloser.id },
    { name: "Diego Almeida", email: "diego.almeida@visus.com", phone: "(11) 99804-4567", teamId: teamCloser.id },
    { name: "Elena Souza", email: "elena.souza@visus.com", phone: "(21) 99805-5678", teamId: teamVarejo.id },
    { name: "Felipe Santos", email: "felipe.santos@visus.com", phone: "(21) 99806-6789", teamId: teamVarejo.id },
  ];

  // Perfis de desempenho realistas (SDR faz mais ligações, Closer mais faturamento)
  const profiles = [
    { fat: 4500, fatV: 1500, lig: 15, ligV: 5, reu: 3, reuV: 2 },  // Ana - SDR boa
    { fat: 3200, fatV: 1200, lig: 12, ligV: 4, reu: 2, reuV: 1 },  // Bruno - SDR médio
    { fat: 8500, fatV: 3000, lig: 6, ligV: 3, reu: 4, reuV: 2 },   // Camila - Closer top
    { fat: 6000, fatV: 2000, lig: 5, ligV: 2, reu: 3, reuV: 2 },   // Diego - Closer consistente
    { fat: 3800, fatV: 1500, lig: 8, ligV: 3, reu: 2, reuV: 1 },   // Elena - Varejo
    { fat: 4200, fatV: 1800, lig: 10, ligV: 4, reu: 3, reuV: 1 },  // Felipe - Varejo
  ];

  const sellers = await Promise.all(
    sellerData.map(async (s) => {
      const hash = await bcrypt.hash("seller123", 10);
      return prisma.seller.create({
        data: {
          companyId: company.id,
          name: s.name,
          email: s.email,
          phone: s.phone,
          teamId: s.teamId,
          passwordHash: hash,
          accessCode: generateAccessCode(),
        },
      });
    })
  );

  console.log(`👥 Usuários: ${sellers.length}`);
  sellers.forEach((s) => console.log(`   ${s.name} — ${s.email} — Senha: seller123`));
  console.log();

  // ═══════════════════════════════════════════════════════════
  // CLIENTES (com datas de entrada realistas)
  // ═══════════════════════════════════════════════════════════
  const now = new Date();
  const clientData = [
    { name: "Clínica São Lucas", email: "contato@saolucas.com.br", phone: "(11) 3456-7890", status: "CLIENT" as const, unitId: unitMatriz.id, entryDate: new Date(2025, 8, 15) },
    { name: "Padaria Pão Quente", email: "gerencia@paoquente.com.br", phone: "(11) 3456-7891", status: "CLIENT" as const, unitId: unitMatriz.id, entryDate: new Date(2025, 10, 3) },
    { name: "Auto Center Rápido", email: "comercial@autocenter.com.br", phone: "(21) 2345-6789", status: "CLIENT" as const, unitId: unitFilial.id, entryDate: new Date(2025, 11, 10) },
    { name: "Pet Shop Amigo Fiel", email: "contato@amigofiel.com.br", phone: "(11) 3567-8901", status: "CLIENT" as const, unitId: unitMatriz.id, entryDate: new Date(2026, 0, 8) },
    { name: "Escola Saber Mais", email: "direcao@sabermais.edu.br", phone: "(11) 98765-4321", status: "CLIENT" as const, unitId: unitMatriz.id, entryDate: new Date(2026, 1, 12) },
    { name: "Restaurante Sabor & Arte", email: "reservas@saborarte.com.br", phone: "(21) 99876-5432", status: "CLIENT" as const, unitId: unitFilial.id, entryDate: new Date(2026, 1, 20) },
    { name: "Escritório ContaFácil", email: "atendimento@contafacil.com.br", phone: "(11) 3678-9012", status: "CLIENT" as const, unitId: unitMatriz.id, entryDate: new Date(2026, 2, 5) },
    { name: "Loja Moda Atual", email: "vendas@modaatual.com.br", phone: "(21) 3789-0123", status: "CLIENT" as const, unitId: unitFilial.id, entryDate: new Date(2026, 2, 18) },
    { name: "Academia VidAtiva", email: "contato@vidativa.com.br", phone: "(11) 3890-1234", status: "INACTIVE" as const, unitId: unitMatriz.id, entryDate: new Date(2025, 6, 1), exitDate: new Date(2026, 1, 28), exitReason: "Migrou para concorrente" },
    { name: "Ótica Visão Clara", email: "loja@visaoclara.com.br", phone: "(21) 3901-2345", status: "INACTIVE" as const, unitId: unitFilial.id, entryDate: new Date(2025, 9, 15), exitDate: new Date(2026, 2, 10), exitReason: "Encerrou atividades" },
    { name: "Farmácia Bem Estar", email: "compras@bemestar.com.br", phone: "(11) 3012-3456", status: "CLIENT" as const, unitId: unitMatriz.id, entryDate: new Date(2026, 2, 25) },
    { name: "Construtora Alicerce", email: "engenharia@alicerce.com.br", phone: "(21) 3123-4567", status: "CLIENT" as const, unitId: unitFilial.id, entryDate: new Date(2026, 3, 1) },
  ];

  const clients = await Promise.all(
    clientData.map((c) =>
      prisma.client.create({
        data: {
          companyId: company.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          status: c.status,
          unitId: c.unitId,
          entryDate: c.entryDate,
          exitDate: (c as any).exitDate ?? null,
          exitReason: (c as any).exitReason ?? null,
        },
      })
    )
  );
  const activeClients = clients.filter((_, i) => clientData[i].status === "CLIENT");
  console.log(`🏢 Clientes: ${clients.length} (${activeClients.length} ativos)\n`);

  // ═══════════════════════════════════════════════════════════
  // KPIs
  // ═══════════════════════════════════════════════════════════
  const kpiFaturamento = await prisma.kpi.create({
    data: {
      companyId: company.id, name: "Faturamento Diário", type: "MONETARY",
      periodicity: "DAILY", targetValue: 30000, isPrimary: true,
      chartType: "LINE", displayOrder: 1, isIndividual: true, isRequired: true, scope: "COMPANY",
    },
  });
  const kpiLigacoes = await prisma.kpi.create({
    data: {
      companyId: company.id, name: "Ligações Realizadas", type: "NUMERIC",
      periodicity: "DAILY", targetValue: 60, isPrimary: false,
      chartType: "LINE", displayOrder: 2, isIndividual: true, isRequired: true, scope: "COMPANY",
    },
  });
  const kpiReunioes = await prisma.kpi.create({
    data: {
      companyId: company.id, name: "Reuniões Marcadas", type: "NUMERIC",
      periodicity: "DAILY", targetValue: 15, isPrimary: false,
      chartType: "LINE", displayOrder: 3, isIndividual: true, isRequired: true, scope: "COMPANY",
    },
  });
  console.log(`📊 KPIs: Faturamento (meta R$30k/dia), Ligações (meta 60/dia), Reuniões (meta 15/dia)\n`);

  // ═══════════════════════════════════════════════════════════
  // FREQUÊNCIA
  // ═══════════════════════════════════════════════════════════
  await prisma.entrySchedule.createMany({
    data: [
      { companyId: company.id, kpiId: kpiFaturamento.id, frequency: "NONE" },
      { companyId: company.id, kpiId: kpiLigacoes.id, frequency: "DAILY", deadlineTime: "18:00" },
      { companyId: company.id, kpiId: kpiReunioes.id, frequency: "DAILY", deadlineTime: "18:00" },
    ],
  });

  // ═══════════════════════════════════════════════════════════
  // FERIADOS 2026
  // ═══════════════════════════════════════════════════════════
  const holidays = [
    { date: new Date(2026, 0, 1), description: "Confraternização Universal" },
    { date: new Date(2026, 1, 16), description: "Carnaval" },
    { date: new Date(2026, 1, 17), description: "Carnaval" },
    { date: new Date(2026, 3, 3), description: "Sexta-Feira Santa" },
    { date: new Date(2026, 3, 21), description: "Tiradentes" },
    { date: new Date(2026, 4, 1), description: "Dia do Trabalho" },
    { date: new Date(2026, 5, 4), description: "Corpus Christi" },
    { date: new Date(2026, 8, 7), description: "Independência do Brasil" },
    { date: new Date(2026, 9, 12), description: "Nossa Senhora Aparecida" },
    { date: new Date(2026, 10, 2), description: "Finados" },
    { date: new Date(2026, 10, 15), description: "Proclamação da República" },
    { date: new Date(2026, 11, 25), description: "Natal" },
  ];
  await prisma.nonWorkingDay.createMany({
    data: holidays.map((h) => ({ companyId: company.id, date: h.date, description: h.description })),
  });
  console.log(`🗓️  Feriados: ${holidays.length}\n`);

  // ═══════════════════════════════════════════════════════════
  // ENTRIES + SALES + LEADS (últimos 3 meses)
  // ═══════════════════════════════════════════════════════════
  console.log("📝 Gerando lançamentos (3 meses)...");

  const entries: any[] = [];
  const sales: any[] = [];
  const leads: any[] = [];

  const volumeUnits = ["licenças", "unidades", "assinaturas", "contratos"];
  const ligNotes = ["Primeiro contato", "Follow-up", "Qualificação", "Retorno", "Apresentação inicial"];
  const reuNotes = ["Reunião de descoberta", "Proposta comercial", "Demonstração do produto", "Negociação final"];
  const fatNotes = ["Venda fechada", "Renovação de contrato", "Upsell", "Cross-sell"];

  for (let monthOffset = -2; monthOffset <= 0; monthOffset++) {
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const daysInMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const entryDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day);
      if (entryDate > now) break;
      const dow = entryDate.getDay();
      if (dow === 0 || dow === 6) continue;
      const isHoliday = holidays.some((h) => h.date.getDate() === entryDate.getDate() && h.date.getMonth() === entryDate.getMonth());
      if (isHoliday) continue;

      // Fator dia da semana (terça-quinta melhor, segunda/sexta mais fraco)
      const dowFactor = [0, 0.85, 1.05, 1.15, 1.1, 0.85, 0][dow];
      // Crescimento mensal leve
      const growth = 1 + (monthOffset + 2) * 0.03;

      for (let si = 0; si < sellers.length; si++) {
        const seller = sellers[si];
        const p = profiles[si];
        const client = pick(activeClients);

        // ── Ligações (cada uma com cliente diferente)
        const ligCount = Math.max(1, Math.round(p.lig * dowFactor * growth + rand(-p.ligV, p.ligV)));
        for (let i = 0; i < ligCount; i++) {
          entries.push({
            companyId: company.id, kpiId: kpiLigacoes.id, sellerId: seller.id,
            clientId: pick(activeClients).id, value: 1, entryDate, notes: pick(ligNotes),
          });
        }

        // ── Reuniões (subset das ligações viram reunião — ~20-30% das ligações)
        const reuCount = Math.max(0, Math.round(p.reu * dowFactor * growth + rand(-p.reuV, p.reuV)));
        for (let i = 0; i < reuCount; i++) {
          entries.push({
            companyId: company.id, kpiId: kpiReunioes.id, sellerId: seller.id,
            clientId: pick(activeClients).id, value: 1, entryDate, notes: pick(reuNotes),
          });
        }

        // ── Faturamento (1-2 vendas por dia, nem todo dia)
        if (Math.random() < 0.7) { // 70% chance de ter venda no dia
          const fatCount = Math.random() < 0.3 ? 2 : 1;
          for (let i = 0; i < fatCount; i++) {
            const amount = Math.round(p.fat * dowFactor * growth + rand(-p.fatV, p.fatV));
            const value = Math.max(800, amount);
            const saleClient = pick(activeClients);
            entries.push({
              companyId: company.id, kpiId: kpiFaturamento.id, sellerId: seller.id,
              clientId: saleClient.id, value, entryDate, notes: pick(fatNotes),
            });
            sales.push({
              companyId: company.id, sellerId: seller.id, clientId: saleClient.id,
              amount: value, saleDate: entryDate,
              expectedVolume: randInt(5, 200), volumeUnit: pick(volumeUnits),
            });
          }
        }

        // ── Leads (2-4 por vendedor por dia, mix qualificado/desqualificado)
        const leadCount = randInt(2, 4);
        for (let i = 0; i < leadCount; i++) {
          leads.push({
            companyId: company.id, sellerId: seller.id,
            clientId: pick(activeClients).id,
            status: Math.random() < 0.55 ? "QUALIFIED" : "DISQUALIFIED",
            entryDate, notes: Math.random() < 0.5 ? "Lead com potencial" : "Sem fit com o produto",
          });
        }
      }
    }
  }

  await prisma.entry.createMany({ data: entries });
  await prisma.sale.createMany({ data: sales });
  await prisma.leadEntry.createMany({ data: leads });

  console.log(`   ✅ Entries: ${entries.length}`);
  console.log(`   ✅ Sales: ${sales.length}`);
  console.log(`   ✅ Leads: ${leads.length}\n`);

  // ═══════════════════════════════════════════════════════════
  // CAMPANHA DE GAMIFICAÇÃO
  // ═══════════════════════════════════════════════════════════
  console.log("🏆 Criando campanha...");

  const campaign = await prisma.campaign.create({
    data: {
      companyId: company.id, name: "Desafio Q1 2026",
      description: "Campanha de incentivo do primeiro trimestre. Acumule pontos e suba de nível!",
      isActive: true, gamificationEnabled: true, seasonType: "MONTHLY",
      resetPointsOnEnd: false, teamMode: false,
    },
  });

  await prisma.scoringRule.createMany({
    data: [
      { campaignId: campaign.id, name: "Pontos por Faturamento", description: "1 ponto a cada R$100", ruleType: "POINTS_PER_UNIT", kpiId: kpiFaturamento.id, pointsPerUnit: 0.01, maxPointsPerDay: 50, maxPointsPerWeek: 250, isActive: true },
      { campaignId: campaign.id, name: "Pontos por Ligação", description: "2 pontos por ligação", ruleType: "POINTS_PER_UNIT", kpiId: kpiLigacoes.id, pointsPerUnit: 2, maxPointsPerDay: 30, maxPointsPerWeek: 150, isActive: true },
      { campaignId: campaign.id, name: "Pontos por Reunião", description: "5 pontos por reunião", ruleType: "POINTS_PER_UNIT", kpiId: kpiReunioes.id, pointsPerUnit: 5, maxPointsPerDay: 25, maxPointsPerWeek: 100, isActive: true },
    ],
  });

  const seasonStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const seasonEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthLabel = seasonStart.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const season = await prisma.season.create({
    data: {
      campaignId: campaign.id,
      name: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      startDate: seasonStart, endDate: seasonEnd, isActive: true,
    },
  });

  await prisma.gamificationLevel.createMany({
    data: [
      { campaignId: campaign.id, name: "Bronze", minPoints: 0, badgeEmoji: "🥉", displayOrder: 1 },
      { campaignId: campaign.id, name: "Prata", minPoints: 200, badgeEmoji: "🥈", displayOrder: 2 },
      { campaignId: campaign.id, name: "Ouro", minPoints: 500, badgeEmoji: "🥇", displayOrder: 3 },
      { campaignId: campaign.id, name: "Diamante", minPoints: 1000, badgeEmoji: "💎", displayOrder: 4 },
      { campaignId: campaign.id, name: "Lenda", minPoints: 2000, badgeEmoji: "👑", displayOrder: 5 },
    ],
  });

  await prisma.campaignParticipant.createMany({
    data: sellers.map((s) => ({ campaignId: campaign.id, sellerId: s.id })),
  });

  // Pontos realistas baseados nos perfis
  await prisma.sellerPoints.createMany({
    data: sellers.map((seller, i) => {
      const p = profiles[i];
      const fatPts = Math.min(50, p.fat * 0.01) * 18;
      const ligPts = Math.min(30, p.lig * 2) * 18;
      const reuPts = Math.min(25, p.reu * 5) * 18;
      return {
        campaignId: campaign.id, seasonId: season.id, sellerId: seller.id,
        totalPoints: Math.round(fatPts + ligPts + reuPts + rand(-80, 80)),
      };
    }),
  });

  console.log(`   ✅ Campanha: ${campaign.name}`);
  console.log(`   ✅ ${sellers.length} participantes com pontos\n`);

  // ═══════════════════════════════════════════════════════════
  // RESUMO
  // ═══════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════");
  console.log("✅ SEED COMPLETO");
  console.log("═══════════════════════════════════════════\n");
  console.log("🔑 Login gestor: admin@visus.com / admin123");
  console.log("🔑 Login usuários: [email]@visus.com / seller123\n");
  console.log("👥 Usuários:");
  sellers.forEach((s) => {
    console.log(`   ${s.name} — ${s.email}`);
  });
}

main()
  .catch((e) => {
    console.error("❌ Seed falhou:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
