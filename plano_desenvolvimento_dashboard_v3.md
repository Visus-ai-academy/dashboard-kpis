# Plano de Desenvolvimento — Dashboard de Metas, KPIs & Gamificação

## 1. Visão Geral do Projeto

### O que é
Plataforma SaaS multi-tenant para gestão de metas comerciais, KPIs configuráveis e gamificação (endomarketing), com dashboards visuais e lançamento individual de dados por vendedores.

### Stack
| Camada | Tecnologia |
|--------|-----------|
| Frontend/Backend | Next.js 14+ (App Router) |
| Autenticação | NextAuth (Credentials Provider — sem OAuth) |
| ORM | Prisma |
| Estilização | TailwindCSS + Shadcn UI |
| Validação | Zod |
| Banco de Dados | Supabase (PostgreSQL) |
| Gráficos | Recharts |

### Premissas
- 2 desenvolvedores full-stack trabalhando de forma assíncrona
- 5 dias úteis de prazo
- MVP funcional — foco em fluxo completo, polimento visual depois
- Supabase usado apenas como PostgreSQL (sem Realtime, sem Auth nativo)

---

## 2. Funcionalidades Mapeadas (Análise dos PDFs)

### 2.1 Estrutura Hierárquica
```
Empresa
  └── Unidades
        └── Setores (ex: SDR, Closer, Varejo)
              └── Equipes
                    └── Vendedores (Nome, Email, Telefone, Código de Acesso, Status)
```

### 2.2 Configuração de KPIs
- **Nome do KPI** (ex: Faturamento Diário, Ligações Realizadas)
- **Tipo**: Numérico | Monetário (R$) | Percentual (%)
- **Periodicidade da Meta**: Diária | Semanal | Mensal
- **Meta Alvo**: valor numérico
- **KPI Individual** (por vendedor): toggle on/off
- **Obrigatório no lançamento**: toggle on/off
- **Meta Principal**: flag para usar como referência nas projeções
- **Escopo do Lançamento**: Empresa (todos lançam) | Vendedores específicos
- **Vínculo a setor**: KPI pode ser vinculado a setores específicos

### 2.3 Dashboard Principal
- Filtros: Data Inicial/Final, Mês Atual, Mês Anterior, KPI, Vendedor
- **Comparativo por Período**: período atual vs anterior (diferença absoluta e %)
- **Meta Diária**: progresso do mês, meta do mês, realizado, falta, meta diária restante
- **Ranking por Vendedor**: posição, meta individual, realizado, falta, meta diária
- **Comparativo de Vendedores**: vendas, ticket médio, % vs média
- **Atingimento de Metas**: % geral, metas batidas vs total
- **Cards de KPI**: realizado, meta, % de atingimento por KPI
- **Detalhamento por KPI**: status (Meta Batida / Abaixo) com barras de progresso

### 2.4 Gráficos
- **Meta x Realizado**: evolução cumulativa (linha realizado + linha meta projetada)
- **Evolução Diária**: desempenho dia a dia
- **Vendas por Dia da Semana**: heatmap horizontal (média últimos 6 meses)
- **Vendas por Dia do Mês**: heatmap/grid comparativo últimos 6 meses

### 2.5 Gamificação / Endomarketing
- **Configuração Geral**: ativar/desativar, tipo de temporada, reset de pontos, modo equipes
- **Abas**: Regras de Pontuação | Temporadas | Participantes | Níveis
- **Regra de Pontuação**: nome, descrição, tipo, KPI base, pontos/unidade, máx dia/semana
- **Temporada**: nome, data início, data fim
- **Campanhas**: vinculadas ao endomarketing (ex: "Ataque Total")

### 2.6 Insights da Reunião (Notas Gemini)
- Projeção considera dias não-úteis e feriados
- KPIs derivados: Ticket Médio e Taxa de Conversão (automáticos)
- Gráficos dinâmicos — refletem dados no momento da consulta
- **Requisito do cliente**: tipo de gráfico configurável por KPI (não padrão fixo)

### 2.7 Requisitos Adicionais
- Cadastro de empresas (multi-tenant)
- Link único por vendedor para lançamento de dados
- Frequência de preenchimento configurável

---

## 3. Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ============================================================
// AUTENTICAÇÃO & MULTI-TENANT
// ============================================================

model Company {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  logoUrl   String?  @map("logo_url")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  users           User[]
  units           Unit[]
  sectors         Sector[]
  teams           Team[]
  sellers         Seller[]
  kpis            Kpi[]
  entries         Entry[]
  entrySchedules  EntrySchedule[]
  nonWorkingDays  NonWorkingDay[]
  campaigns       Campaign[]
  sales           Sale[]

  @@map("companies")
}

model User {
  id           String   @id @default(uuid())
  companyId    String   @map("company_id")
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String
  role         UserRole @default(MANAGER)
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@map("users")
}

enum UserRole {
  ADMIN
  MANAGER
  VIEWER
}

// ============================================================
// ESTRUTURA ORGANIZACIONAL
// ============================================================

model Unit {
  id        String   @id @default(uuid())
  companyId String   @map("company_id")
  name      String
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")

  company Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  sectors Sector[]

  @@map("units")
}

model Sector {
  id        String   @id @default(uuid())
  companyId String   @map("company_id")
  unitId    String?  @map("unit_id")
  name      String
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")

  company    Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  unit       Unit?       @relation(fields: [unitId], references: [id], onDelete: SetNull)
  teams      Team[]
  kpiSectors KpiSector[]

  @@map("sectors")
}

model Team {
  id        String   @id @default(uuid())
  sectorId  String   @map("sector_id")
  companyId String   @map("company_id")
  name      String
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")

  sector  Sector   @relation(fields: [sectorId], references: [id], onDelete: Cascade)
  company Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  sellers Seller[]

  @@map("teams")
}

model Seller {
  id          String   @id @default(uuid())
  companyId   String   @map("company_id")
  teamId      String?  @map("team_id")
  name        String
  email       String?
  phone       String?
  accessCode  String   @unique @map("access_code")
  accessToken String   @unique @default(uuid()) @map("access_token")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")

  company               Company                @relation(fields: [companyId], references: [id], onDelete: Cascade)
  team                  Team?                  @relation(fields: [teamId], references: [id], onDelete: SetNull)
  kpiSellers            KpiSeller[]
  monthlyTargets        MonthlyTarget[]
  entries               Entry[]
  sales                 Sale[]
  campaignParticipants  CampaignParticipant[]
  sellerPoints          SellerPoints[]

  @@map("sellers")
}

// ============================================================
// KPIs & METAS
// ============================================================

model Kpi {
  id           String      @id @default(uuid())
  companyId    String      @map("company_id")
  name         String
  type         KpiType     @default(NUMERIC)
  periodicity  Periodicity @default(DAILY)
  targetValue  Decimal     @default(0) @map("target_value")
  isIndividual Boolean     @default(true) @map("is_individual")
  isRequired   Boolean     @default(true) @map("is_required")
  isPrimary    Boolean     @default(false) @map("is_primary")
  scope        KpiScope    @default(COMPANY)
  chartType    ChartType   @default(LINE) @map("chart_type")
  displayOrder Int         @default(0) @map("display_order")
  isActive     Boolean     @default(true) @map("is_active")
  createdAt    DateTime    @default(now()) @map("created_at")

  company        Company         @relation(fields: [companyId], references: [id], onDelete: Cascade)
  kpiSectors     KpiSector[]
  kpiSellers     KpiSeller[]
  monthlyTargets MonthlyTarget[]
  entries        Entry[]
  entrySchedules EntrySchedule[]
  scoringRules   ScoringRule[]

  @@map("kpis")
}

enum KpiType {
  NUMERIC
  MONETARY
  PERCENTAGE
}

enum Periodicity {
  DAILY
  WEEKLY
  MONTHLY
}

enum KpiScope {
  COMPANY
  SPECIFIC_SELLERS
}

enum ChartType {
  LINE
  BAR
  AREA
  PIE
  RADIAL
  STACKED_BAR
}

model KpiSector {
  id       String @id @default(uuid())
  kpiId    String @map("kpi_id")
  sectorId String @map("sector_id")

  kpi    Kpi    @relation(fields: [kpiId], references: [id], onDelete: Cascade)
  sector Sector @relation(fields: [sectorId], references: [id], onDelete: Cascade)

  @@unique([kpiId, sectorId])
  @@map("kpi_sectors")
}

model KpiSeller {
  id           String   @id @default(uuid())
  kpiId        String   @map("kpi_id")
  sellerId     String   @map("seller_id")
  customTarget Decimal? @map("custom_target")

  kpi    Kpi    @relation(fields: [kpiId], references: [id], onDelete: Cascade)
  seller Seller @relation(fields: [sellerId], references: [id], onDelete: Cascade)

  @@unique([kpiId, sellerId])
  @@map("kpi_sellers")
}

model MonthlyTarget {
  id          String  @id @default(uuid())
  kpiId       String  @map("kpi_id")
  sellerId    String? @map("seller_id")
  month       Int
  year        Int
  targetValue Decimal @map("target_value")

  kpi    Kpi     @relation(fields: [kpiId], references: [id], onDelete: Cascade)
  seller Seller? @relation(fields: [sellerId], references: [id], onDelete: SetNull)

  @@unique([kpiId, sellerId, month, year])
  @@map("monthly_targets")
}

// ============================================================
// LANÇAMENTOS
// ============================================================

model Entry {
  id        String   @id @default(uuid())
  companyId String   @map("company_id")
  kpiId     String   @map("kpi_id")
  sellerId  String   @map("seller_id")
  value     Decimal
  entryDate DateTime @map("entry_date") @db.Date
  notes     String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  kpi     Kpi     @relation(fields: [kpiId], references: [id], onDelete: Cascade)
  seller  Seller  @relation(fields: [sellerId], references: [id], onDelete: Cascade)

  @@index([companyId, kpiId, sellerId, entryDate])
  @@index([companyId, entryDate])
  @@map("entries")
}

model EntrySchedule {
  id              String      @id @default(uuid())
  companyId       String      @map("company_id")
  kpiId           String      @map("kpi_id")
  frequency       Periodicity
  deadlineTime    String?     @map("deadline_time")
  reminderEnabled Boolean     @default(false) @map("reminder_enabled")
  createdAt       DateTime    @default(now()) @map("created_at")

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  kpi     Kpi     @relation(fields: [kpiId], references: [id], onDelete: Cascade)

  @@map("entry_schedules")
}

model NonWorkingDay {
  id              String   @id @default(uuid())
  companyId       String   @map("company_id")
  date            DateTime @db.Date
  description     String?
  includeSaturday Boolean  @default(false) @map("include_saturday")
  includeSunday   Boolean  @default(false) @map("include_sunday")

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, date])
  @@map("non_working_days")
}

// ============================================================
// GAMIFICAÇÃO / ENDOMARKETING
// ============================================================

model Campaign {
  id                  String     @id @default(uuid())
  companyId           String     @map("company_id")
  name                String
  description         String?
  isActive            Boolean    @default(true) @map("is_active")
  gamificationEnabled Boolean    @default(true) @map("gamification_enabled")
  seasonType          SeasonType @default(MONTHLY) @map("season_type")
  resetPointsOnEnd    Boolean    @default(false) @map("reset_points_on_end")
  teamMode            Boolean    @default(false) @map("team_mode")
  createdAt           DateTime   @default(now()) @map("created_at")

  company      Company                @relation(fields: [companyId], references: [id], onDelete: Cascade)
  scoringRules ScoringRule[]
  seasons      Season[]
  participants CampaignParticipant[]
  levels       GamificationLevel[]
  sellerPoints SellerPoints[]

  @@map("campaigns")
}

enum SeasonType {
  WEEKLY
  MONTHLY
  CUSTOM
}

model ScoringRule {
  id               String   @id @default(uuid())
  campaignId       String   @map("campaign_id")
  name             String
  description      String?
  ruleType         RuleType @default(POINTS_PER_UNIT) @map("rule_type")
  kpiId            String?  @map("kpi_id")
  pointsPerUnit    Decimal  @default(0) @map("points_per_unit")
  maxPointsPerDay  Decimal  @default(0) @map("max_points_per_day")
  maxPointsPerWeek Decimal  @default(0) @map("max_points_per_week")
  isActive         Boolean  @default(true) @map("is_active")
  createdAt        DateTime @default(now()) @map("created_at")

  campaign Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  kpi      Kpi?     @relation(fields: [kpiId], references: [id], onDelete: SetNull)

  @@map("scoring_rules")
}

enum RuleType {
  POINTS_PER_UNIT
  BONUS_THRESHOLD
  MULTIPLIER
}

model Season {
  id         String   @id @default(uuid())
  campaignId String   @map("campaign_id")
  name       String
  startDate  DateTime @map("start_date") @db.Date
  endDate    DateTime @map("end_date") @db.Date
  isActive   Boolean  @default(false) @map("is_active")
  createdAt  DateTime @default(now()) @map("created_at")

  campaign     Campaign       @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  sellerPoints SellerPoints[]

  @@map("seasons")
}

model CampaignParticipant {
  id         String   @id @default(uuid())
  campaignId String   @map("campaign_id")
  sellerId   String   @map("seller_id")
  joinedAt   DateTime @default(now()) @map("joined_at")

  campaign Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  seller   Seller   @relation(fields: [sellerId], references: [id], onDelete: Cascade)

  @@unique([campaignId, sellerId])
  @@map("campaign_participants")
}

model GamificationLevel {
  id           String  @id @default(uuid())
  campaignId   String  @map("campaign_id")
  name         String
  minPoints    Decimal @map("min_points")
  badgeEmoji   String? @map("badge_emoji")
  displayOrder Int     @default(0) @map("display_order")

  campaign Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@map("gamification_levels")
}

model SellerPoints {
  id          String   @id @default(uuid())
  campaignId  String   @map("campaign_id")
  seasonId    String   @map("season_id")
  sellerId    String   @map("seller_id")
  totalPoints Decimal  @default(0) @map("total_points")
  updatedAt   DateTime @updatedAt @map("updated_at")

  campaign Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  season   Season   @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  seller   Seller   @relation(fields: [sellerId], references: [id], onDelete: Cascade)

  @@unique([campaignId, seasonId, sellerId])
  @@map("seller_points")
}

// ============================================================
// VENDAS
// ============================================================

model Sale {
  id        String   @id @default(uuid())
  companyId String   @map("company_id")
  sellerId  String   @map("seller_id")
  amount    Decimal
  saleDate  DateTime @map("sale_date") @db.Date
  createdAt DateTime @default(now()) @map("created_at")

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  seller  Seller  @relation(fields: [sellerId], references: [id], onDelete: Cascade)

  @@index([companyId, sellerId, saleDate])
  @@map("sales")
}
```

---

## 4. Estrutura de Pastas

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                      -- dashboard principal
│   │   ├── config/
│   │   │   ├── units/page.tsx
│   │   │   ├── sectors/page.tsx
│   │   │   ├── teams/page.tsx
│   │   │   ├── sellers/page.tsx
│   │   │   └── kpis/page.tsx
│   │   ├── campaigns/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── history/
│   │   │   ├── sales/page.tsx
│   │   │   └── entries/page.tsx
│   │   └── analytics/page.tsx
│   ├── launch/[token]/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── companies/route.ts
│       ├── units/route.ts
│       ├── sectors/route.ts
│       ├── teams/route.ts
│       ├── sellers/route.ts
│       ├── kpis/route.ts
│       ├── entries/route.ts
│       ├── campaigns/route.ts
│       ├── scoring-rules/route.ts
│       ├── seasons/route.ts
│       ├── dashboard/route.ts
│       └── launch/[token]/route.ts
├── components/
│   ├── ui/                               -- shadcn
│   ├── dashboard/
│   │   ├── period-comparison.tsx
│   │   ├── daily-target.tsx
│   │   ├── seller-ranking.tsx
│   │   ├── seller-comparison.tsx
│   │   ├── goal-achievement.tsx
│   │   ├── kpi-detail-card.tsx
│   │   └── chart-wrapper.tsx
│   ├── charts/
│   │   ├── line-chart.tsx
│   │   ├── bar-chart.tsx
│   │   ├── area-chart.tsx
│   │   ├── heatmap-week.tsx
│   │   ├── heatmap-month.tsx
│   │   └── radial-chart.tsx
│   ├── forms/
│   │   ├── kpi-form.tsx
│   │   ├── seller-form.tsx
│   │   ├── campaign-form.tsx
│   │   └── entry-form.tsx
│   ├── gamification/
│   │   ├── campaign-card.tsx
│   │   ├── ranking-widget.tsx
│   │   ├── scoring-rules-tab.tsx
│   │   ├── seasons-tab.tsx
│   │   ├── participants-tab.tsx
│   │   └── levels-tab.tsx
│   └── layout/
│       ├── sidebar.tsx
│       ├── header.tsx
│       └── filters-bar.tsx
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── validators/
│   │   ├── kpi.ts
│   │   ├── seller.ts
│   │   ├── entry.ts
│   │   └── campaign.ts
│   ├── queries/
│   │   ├── dashboard.ts
│   │   ├── rankings.ts
│   │   └── projections.ts
│   └── utils/
│       ├── dates.ts
│       ├── formatting.ts
│       └── access-code.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── types/
    └── index.ts
```

---

## 5. Features — Plano por Fase

### Legenda de Complexidade
- 🟢 Simples (< 2h)
- 🟡 Médio (2-4h)
- 🔴 Complexo (4-8h)

---

### FASE 1 — Fundação (Dia 1)

> Tudo que vem depois depende desta fase. Deve ser finalizada e mergeada antes de avançar.

#### Feature 1.1 — Setup do Projeto
| # | Task | Complexidade |
|---|------|-------------|
| 1.1.1 | Criar projeto Next.js (App Router), instalar TailwindCSS, Shadcn UI, Recharts, Zod, NextAuth, Prisma, bcrypt | 🟢 |
| 1.1.2 | Instalar componentes Shadcn: Button, Input, Dialog, Select, Table, Tabs, Badge, Card, DropdownMenu, Toggle, Toast, Separator, Sheet, Skeleton | 🟢 |
| 1.1.3 | Configurar Prisma: `prisma init`, colar schema, configurar `DATABASE_URL` e `DIRECT_URL` para Supabase, rodar `npx prisma db push` | 🟡 |
| 1.1.4 | Criar `lib/prisma.ts` (singleton do PrismaClient) | 🟢 |

#### Feature 1.2 — Autenticação
| # | Task | Complexidade |
|---|------|-------------|
| 1.2.1 | Configurar NextAuth com Credentials Provider: busca user por email via Prisma, compara hash com bcrypt, retorna session com `userId`, `companyId`, `role` | 🟡 |
| 1.2.2 | Middleware de proteção de rotas: `/(dashboard)/*` requer session ativa, redirect para `/login` | 🟡 |
| 1.2.3 | Tela de login estilizada com Shadcn (email + senha + botão) | 🟡 |

#### Feature 1.3 — Layout Base
| # | Task | Complexidade |
|---|------|-------------|
| 1.3.1 | Layout `(dashboard)/layout.tsx`: sidebar com navegação (Dashboard, Configuração com submenu para Unidades/Setores/Equipes/Vendedores/KPIs, Endomarketing > Campanhas, Histórico > Vendas/Lançamentos) | 🟡 |
| 1.3.2 | Header com nome do usuário, nome da empresa (da session), botão "Lançar Vendas" | 🟡 |
| 1.3.3 | Sidebar colapsável para mobile (Shadcn Sheet) | 🟢 |

#### Feature 1.4 — Utilitários Compartilhados
| # | Task | Complexidade |
|---|------|-------------|
| 1.4.1 | Schemas Zod: `validators/kpi.ts`, `validators/seller.ts`, `validators/entry.ts`, `validators/campaign.ts` | 🟡 |
| 1.4.2 | `lib/utils/dates.ts`: calcular dias úteis restantes no mês, verificar se data é dia útil | 🟡 |
| 1.4.3 | `lib/utils/formatting.ts`: formatar BRL (`R$ 1.520`), porcentagem (`121%`), números | 🟢 |
| 1.4.4 | `lib/utils/access-code.ts`: gerar código hex de 8 caracteres para vendedores | 🟢 |

#### Feature 1.5 — Seed de Dados
| # | Task | Complexidade |
|---|------|-------------|
| 1.5.1 | `prisma/seed.ts`: empresa demo, usuário admin (senha hasheada), 2 unidades, 2 setores (SDR + Varejo), 1 equipe por setor, 5 vendedores com access_code e access_token | 🟡 |
| 1.5.2 | Configurar `package.json` com script de seed (`prisma.seed` em `ts-node`) | 🟢 |

---

### FASE 2 — Configuração (Dia 2)

> Admin consegue montar toda a estrutura organizacional e definir KPIs. Cada feature é um CRUD completo (API + tela).

#### Feature 2.1 — CRUD Unidades
| # | Task | Complexidade |
|---|------|-------------|
| 2.1.1 | API `GET /api/units` (listar por companyId), `POST` (criar), `PUT` (editar), `DELETE` — Prisma queries + Zod validation | 🟡 |
| 2.1.2 | Tela `config/units/page.tsx`: tabela Shadcn (nome, status), modal criar/editar, botão excluir com confirmação via Dialog | 🟡 |

#### Feature 2.2 — CRUD Setores
| # | Task | Complexidade |
|---|------|-------------|
| 2.2.1 | API `sectors`: CRUD com filtro por unidade, include `unit.name` no retorno | 🟡 |
| 2.2.2 | Tela `config/sectors/page.tsx`: tabela (nome, unidade vinculada, status), modal com Select de unidade | 🟡 |

#### Feature 2.3 — CRUD Equipes
| # | Task | Complexidade |
|---|------|-------------|
| 2.3.1 | API `teams`: CRUD com filtro por setor, include `sector.name` | 🟢 |
| 2.3.2 | Tela `config/teams/page.tsx`: tabela (nome, setor, status), modal com Select de setor | 🟡 |

#### Feature 2.4 — CRUD Vendedores
| # | Task | Complexidade |
|---|------|-------------|
| 2.4.1 | API `sellers`: CRUD com include team/sector. Na criação, gerar `accessCode` (8 chars hex) e `accessToken` (UUID) automaticamente | 🟡 |
| 2.4.2 | Tela `config/sellers/page.tsx` conforme PDF: tabela com Nome, Email, Telefone, Código de Acesso (badge), Status (toggle ativo/inativo), Ações (copiar link, regenerar código, editar, excluir) | 🔴 |
| 2.4.3 | Modal "Editar Vendedor" conforme PDF: campos Nome*, Email, Telefone, botões Cancelar/Salvar | 🟡 |
| 2.4.4 | Botão copiar link de lançamento: copia `{BASE_URL}/launch/{accessToken}` com toast de confirmação | 🟢 |

#### Feature 2.5 — CRUD KPIs
| # | Task | Complexidade |
|---|------|-------------|
| 2.5.1 | API `kpis`: CRUD + criação de vínculos `kpiSectors` e `kpiSellers` na mesma request via Prisma transaction | 🟡 |
| 2.5.2 | Tela `config/kpis/page.tsx`: tabela com Ordem (setas ↑↓), Nome, Tipo, Periodicidade, Meta, Escopo (badge), Vínculo, Status (toggle), Ações. Botões "Metas Mensais" e "+ Novo KPI" | 🔴 |
| 2.5.3 | Modal "Novo KPI" completo conforme PDF: Nome, Tipo (Numérico/Monetário R$/Percentual %), Periodicidade (Diária/Semanal/Mensal), Meta Alvo, KPI Individual toggle, Obrigatório no lançamento toggle, Meta Principal toggle, Escopo (Empresa/Vendedores específicos), **Select de Tipo de Gráfico** (Linha/Barra/Área/Pizza/Radial/Barras Empilhadas) | 🟡 |
| 2.5.4 | Modal "Metas Mensais": grid editável 12 meses x KPIs, opcionalmente por vendedor. Usa tabela `monthlyTargets` | 🟡 |
| 2.5.5 | Reordenação de KPIs: botões ↑↓ na tabela que atualizam campo `displayOrder` via API | 🟢 |

---

### FASE 3 — Dashboard Principal (Dia 3)

> Visualização central da plataforma. Cada feature é um componente visual + sua query de dados.

#### Feature 3.1 — Barra de Filtros
| # | Task | Complexidade |
|---|------|-------------|
| 3.1.1 | `components/layout/filters-bar.tsx`: Date pickers (Data Inicial/Final), botões "Mês Atual" e "Mês Anterior" (preenchem datas automaticamente), Select de KPI (carrega da API), Select de Vendedor (carrega da API) | 🟡 |
| 3.1.2 | Estado de filtros via URL params (para compartilhamento de link e back button) | 🟡 |

#### Feature 3.2 — Comparativo por Período
| # | Task | Complexidade |
|---|------|-------------|
| 3.2.1 | API `GET /api/dashboard/comparison?startDate&endDate&kpiId&sellerId`: agrega entries do período selecionado e do período anterior de mesmo tamanho, calcula soma por KPI e diferença | 🟡 |
| 3.2.2 | `dashboard/period-comparison.tsx` conforme PDF: nome do KPI, período atual (número grande), período anterior, diferença com cor (verde positivo, vermelho negativo), barras de comparação, badge de % | 🟡 |

#### Feature 3.3 — Meta Diária
| # | Task | Complexidade |
|---|------|-------------|
| 3.3.1 | API `GET /api/dashboard/daily-target`: calcula para o KPI principal — meta do mês (de `monthlyTargets` ou `kpi.targetValue`), soma realizado até agora, falta, dias úteis restantes, meta diária = falta / dias restantes, progresso % | 🟡 |
| 3.3.2 | `dashboard/daily-target.tsx` conforme PDF: "X dias úteis restantes", barra de progresso do mês com %, 4 mini-cards (Meta do Mês, Realizado, Falta, Meta Diária "por dia útil"), toggles Sáb/Dom/Feriados que recalculam | 🔴 |

#### Feature 3.4 — Ranking por Vendedor
| # | Task | Complexidade |
|---|------|-------------|
| 3.4.1 | API: dentro do endpoint de dashboard, retornar array de vendedores ordenados por realizado, com meta individual, falta, % atingimento | 🟡 |
| 3.4.2 | `dashboard/seller-ranking.tsx` conforme PDF: lista numerada (1, 2, 3...), nome do vendedor, mini-infos (Meta, Real, Falta, Diária), barra de % com cor (verde > 80%, amarelo > 50%, vermelho < 50%) | 🟡 |

#### Feature 3.5 — Comparativo de Vendedores
| # | Task | Complexidade |
|---|------|-------------|
| 3.5.1 | API: ranking por total de vendas, ticket médio por vendedor, média geral da empresa, % vs média | 🟡 |
| 3.5.2 | `dashboard/seller-comparison.tsx` conforme PDF: posição numerada, nome, vendas (número), ticket médio, badge "X% vs média" (verde acima, vermelho abaixo) | 🟡 |

#### Feature 3.6 — Atingimento de Metas
| # | Task | Complexidade |
|---|------|-------------|
| 3.6.1 | API: para cada KPI ativo, retornar realizado vs meta com % e status booleano (batida/abaixo) | 🟡 |
| 3.6.2 | `dashboard/goal-achievement.tsx` conforme PDF: % geral grande (verde se > 100%), "X de Y metas batidas", lista de KPIs com nome, barra de progresso, badge (Meta Batida verde / Abaixo vermelho) | 🟡 |

#### Feature 3.7 — Cards de KPI
| # | Task | Complexidade |
|---|------|-------------|
| 3.7.1 | `dashboard/kpi-detail-card.tsx`: card individual — nome do KPI, realizado, meta, barra de progresso com %, ícone de hashtag. Usado em grid na parte inferior do dashboard | 🟡 |

#### Feature 3.8 — Gráficos Base
| # | Task | Complexidade |
|---|------|-------------|
| 3.8.1 | `charts/chart-wrapper.tsx`: recebe `chartType` (do enum do KPI) e `data`, renderiza o componente correto via switch/map | 🟡 |
| 3.8.2 | `charts/line-chart.tsx`: Meta x Realizado cumulativo — duas linhas (vermelha sólida = realizado, verde pontilhada = meta), eixo X com datas, eixo Y com valores, Recharts `LineChart` + `Line` + `CartesianGrid` + `Tooltip` | 🟡 |
| 3.8.3 | `charts/bar-chart.tsx`: barras verticais simples, configurável para qualquer KPI | 🟢 |
| 3.8.4 | `charts/area-chart.tsx`: área preenchida com gradiente, configurável | 🟢 |
| 3.8.5 | `charts/line-chart.tsx` (modo Evolução Diária): linha com pontos mostrando valor dia a dia (não cumulativo) | 🟢 |

#### Feature 3.9 — Montagem da Página Principal
| # | Task | Complexidade |
|---|------|-------------|
| 3.9.1 | `(dashboard)/page.tsx`: composição de todos os componentes acima, chamadas às APIs com os filtros, grid layout responsivo conforme PDF (comparativo no topo, meta diária, ranking, comparativo vendedores, atingimento, cards KPI, gráficos) | 🔴 |

---

### FASE 4 — Lançamento de Dados (Dia 4)

> Vendedores acessam link único e lançam dados que alimentam o dashboard.

#### Feature 4.1 — Link Único do Vendedor
| # | Task | Complexidade |
|---|------|-------------|
| 4.1.1 | API `GET /api/launch/[token]`: valida token via `prisma.seller.findUnique({ where: { accessToken } })`, retorna nome do vendedor + lista de KPIs com status de preenchimento (já preencheu hoje/semana/mês conforme periodicidade) | 🟡 |
| 4.1.2 | API `POST /api/launch/[token]`: recebe `[{ kpiId, value, notes? }]`, valida com Zod, verifica duplicatas (mesmo kpi + seller + data), cria entries via Prisma transaction | 🟡 |
| 4.1.3 | Tela `launch/[token]/page.tsx`: página pública sem sidebar/header. Mostra nome do vendedor, data atual, lista de KPIs com input numérico (formatação conforme tipo: R$ para monetário, % para percentual), badge "já preenchido" para os já lançados, botão "Lançar", tela de sucesso após submit | 🔴 |
| 4.1.4 | Validação de frequência: ao carregar a página, verificar entries existentes do vendedor — para KPI diário, checar se já tem entry de hoje; semanal, se já tem da semana; mensal, do mês. Marcar como "preenchido" os que já foram | 🟡 |

#### Feature 4.2 — Configuração de Frequência
| # | Task | Complexidade |
|---|------|-------------|
| 4.2.1 | API `entry-schedules`: CRUD para configurar frequência de preenchimento por KPI (frequency: daily/weekly/monthly, deadlineTime) | 🟢 |
| 4.2.2 | Na tela de KPIs ou em tela separada: configurar frequência e horário limite de preenchimento para cada KPI | 🟡 |

#### Feature 4.3 — Histórico de Lançamentos
| # | Task | Complexidade |
|---|------|-------------|
| 4.3.1 | API `GET /api/entries?startDate&endDate&sellerId&kpiId`: listagem paginada de entries com include de seller.name e kpi.name | 🟡 |
| 4.3.2 | Tela `history/entries/page.tsx`: tabela paginada com colunas Data, Vendedor, KPI, Valor (formatado por tipo), Horário do lançamento. Filtros de data, vendedor, KPI | 🟡 |

#### Feature 4.4 — Cálculo de Pontos ao Lançar
| # | Task | Complexidade |
|---|------|-------------|
| 4.4.1 | Ao criar entry via POST, buscar campanhas ativas com regras vinculadas ao KPI do lançamento. Calcular pontos = value × pointsPerUnit. Respeitar maxPointsPerDay e maxPointsPerWeek. Fazer upsert em `sellerPoints` | 🟡 |

---

### FASE 5 — Gamificação / Endomarketing (Dia 4)

> Sistema de campanhas com pontuação e ranking para engajar vendedores. Pode ser desenvolvido em paralelo com a Fase 4.

#### Feature 5.1 — CRUD Campanhas
| # | Task | Complexidade |
|---|------|-------------|
| 5.1.1 | API `campaigns`: CRUD completo com Prisma (create, list by companyId, update, delete) | 🟡 |
| 5.1.2 | Tela `campaigns/page.tsx`: lista de campanhas em cards (nome, descrição, status badge, tipo temporada, nº participantes, botão editar). Botão "+ Nova Campanha" abre modal com campos: nome, descrição, tipo temporada (Semanal/Mensal/Custom), reset pontos toggle, modo equipes toggle, ativo toggle | 🟡 |

#### Feature 5.2 — Detalhe da Campanha (Abas)
| # | Task | Complexidade |
|---|------|-------------|
| 5.2.1 | Tela `campaigns/[id]/page.tsx`: header com nome e status da campanha, componente Tabs do Shadcn com 4 abas | 🟡 |

#### Feature 5.3 — Regras de Pontuação
| # | Task | Complexidade |
|---|------|-------------|
| 5.3.1 | API `scoring-rules`: CRUD vinculado à campanha | 🟡 |
| 5.3.2 | `gamification/scoring-rules-tab.tsx`: listagem de regras em tabela/cards, botão "+ Nova Regra" abre modal conforme PDF — Nome da Regra*, Descrição, Tipo de Regra (Pontos por unidade/Bonus threshold/Multiplicador), KPI Base (select), Pontos por unidade, Máx. pontos/dia, Máx. pontos/semana, Toggle regra ativa | 🔴 |

#### Feature 5.4 — Temporadas
| # | Task | Complexidade |
|---|------|-------------|
| 5.4.1 | API `seasons`: CRUD vinculado à campanha | 🟢 |
| 5.4.2 | `gamification/seasons-tab.tsx`: listagem com nome, período, status (ativa/inativa). Modal conforme PDF — Nome*, Data Início*, Data Fim*, toggle ativo | 🟡 |

#### Feature 5.5 — Participantes
| # | Task | Complexidade |
|---|------|-------------|
| 5.5.1 | API: listar vendedores da empresa, adicionar/remover participantes da campanha | 🟡 |
| 5.5.2 | `gamification/participants-tab.tsx`: lista de vendedores com checkbox ou multi-select, mostra quem já é participante, botão salvar atualiza vínculos | 🟡 |

#### Feature 5.6 — Níveis
| # | Task | Complexidade |
|---|------|-------------|
| 5.6.1 | API: CRUD de `gamificationLevels` vinculado à campanha | 🟢 |
| 5.6.2 | `gamification/levels-tab.tsx`: tabela com Nome, Pontos Mínimos, Badge (emoji), Ordem. Modal de criação/edição | 🟡 |

#### Feature 5.7 — Widget de Ranking no Dashboard
| # | Task | Complexidade |
|---|------|-------------|
| 5.7.1 | `gamification/ranking-widget.tsx`: busca campanha ativa + temporada ativa + sellerPoints ordenados. Exibe ranking: posição, nome, pontos totais, nível atual (com emoji), barra de progresso para o próximo nível | 🟡 |
| 5.7.2 | Adicionar widget ao dashboard principal (condicional: só aparece se houver campanha ativa) | 🟢 |

---

### FASE 6 — Gráficos Avançados & Polimento (Dia 5)

> Heatmaps, projeções refinadas, KPIs derivados, responsividade, estados de loading/empty/error.

#### Feature 6.1 — Heatmap Vendas por Dia da Semana
| # | Task | Complexidade |
|---|------|-------------|
| 6.1.1 | Query Prisma: agrupar sales dos últimos 6 meses por dia da semana (0-6), calcular média | 🟡 |
| 6.1.2 | `charts/heatmap-week.tsx` conforme PDF: barras horizontais (Dom a Sáb), cor por intensidade (escala de verde), valor `R$` dentro de cada barra | 🔴 |

#### Feature 6.2 — Heatmap Vendas por Dia do Mês
| # | Task | Complexidade |
|---|------|-------------|
| 6.2.1 | Query Prisma: agrupar sales dos últimos 6 meses por dia (1-31) e mês, criar matrix | 🟡 |
| 6.2.2 | `charts/heatmap-month.tsx` conforme PDF: grid com 30 linhas × 6 colunas (meses), cada célula colorida por intensidade, legenda "Menor → Maior" | 🔴 |

#### Feature 6.3 — Projeção Refinada
| # | Task | Complexidade |
|---|------|-------------|
| 6.3.1 | `lib/queries/projections.ts`: função que recebe companyId, mês/ano, e retorna dias úteis restantes consultando `nonWorkingDays` do Prisma + respeitando toggles de sáb/dom | 🟡 |
| 6.3.2 | Integrar projeção refinada ao endpoint `/api/dashboard/daily-target`, substituindo cálculo simples | 🟡 |

#### Feature 6.4 — KPIs Derivados Automáticos
| # | Task | Complexidade |
|---|------|-------------|
| 6.4.1 | Ticket Médio = soma(sales.amount) / count(sales) no período. Taxa de Conversão = count(sales) / count(entries do KPI "ligações") se existir | 🟡 |
| 6.4.2 | Adicionar ao retorno do endpoint de dashboard como cards adicionais (sem precisar criar KPI manual) | 🟢 |

#### Feature 6.5 — Histórico de Vendas
| # | Task | Complexidade |
|---|------|-------------|
| 6.5.1 | API `GET /api/sales`: listagem paginada com filtros (data, vendedor) | 🟡 |
| 6.5.2 | Tela `history/sales/page.tsx`: tabela paginada (Data, Vendedor, Valor, Horário), filtros | 🟡 |

#### Feature 6.6 — Dias Não-Úteis / Feriados
| # | Task | Complexidade |
|---|------|-------------|
| 6.6.1 | API + tela simples (pode ser seção dentro de config) para cadastrar feriados: data, descrição. Toggles globais para considerar sáb/dom | 🟡 |

#### Feature 6.7 — Polimento de UX
| # | Task | Complexidade |
|---|------|-------------|
| 6.7.1 | Loading states: Skeleton do Shadcn em todas as tabelas, cards e gráficos enquanto dados carregam | 🟡 |
| 6.7.2 | Empty states: mensagem e ilustração quando não há dados ("Nenhum lançamento encontrado", "Crie seu primeiro KPI", etc.) | 🟡 |
| 6.7.3 | Error handling: toast de erro em falhas de API, error boundary em componentes de gráfico | 🟡 |
| 6.7.4 | Responsividade: testar todas as telas em mobile/tablet, sidebar colapsável, cards empilhados, gráficos com scroll horizontal | 🟡 |

#### Feature 6.8 — Seed Robusto para Demonstração
| # | Task | Complexidade |
|---|------|-------------|
| 6.8.1 | Expandir `prisma/seed.ts`: popular 30 dias de entries com variação realista, 30 dias de sales, 1 campanha ativa com regras e temporada, pontos calculados para cada vendedor | 🟡 |

#### Feature 6.9 — Teste End-to-End
| # | Task | Complexidade |
|---|------|-------------|
| 6.9.1 | Fluxo completo: login → criar unidade/setor/equipe → criar vendedores → criar KPIs (com tipo de gráfico diferente para cada) → criar campanha com regras → lançar dados via link do vendedor → verificar dashboard (todos os cards, gráficos, rankings) → verificar ranking da gamificação | 🟡 |

---

## 6. Resumo de Alocação por Dia

| Dia | Fases | Nº Tasks | Foco |
|-----|-------|----------|------|
| **1** | Fase 1 (Fundação) | 16 | Setup, auth, layout, utils, seed |
| **2** | Fase 2 (Configuração) | 17 | CRUDs: unidades, setores, equipes, vendedores, KPIs |
| **3** | Fase 3 (Dashboard) | 17 | Cards, rankings, gráficos base, página principal |
| **4** | Fases 4 + 5 (Lançamento + Gamificação) | 21 | Link vendedor, entries, campanhas, regras, ranking |
| **5** | Fase 6 (Avançado + Polimento) | 16 | Heatmaps, projeções, KPIs derivados, UX, testes |

---

## 7. Mapa de Dependências entre Features

```
Fase 1 (Fundação)
  │
  ├── OBRIGATÓRIO antes de tudo
  │
  ▼
Fase 2 (Configuração)
  │
  ├── 2.1 Unidades ──┐
  ├── 2.2 Setores ───┤── podem ser feitas em paralelo
  ├── 2.3 Equipes ───┤   (cada CRUD é independente)
  ├── 2.4 Vendedores─┤
  └── 2.5 KPIs ──────┘
        │
        ▼
  ┌─────┴─────┐
  ▼           ▼
Fase 3       Fase 4          Fase 5
(Dashboard)  (Lançamento)    (Gamificação)
  │            │               │
  │            └── depende ────┘ (pontos calculados ao lançar)
  │                              
  └──── todas convergem para ──→ Fase 6 (Polimento)
```

**Paralelismo possível no Dia 4**: Lançamento de Dados e Gamificação podem ser desenvolvidos ao mesmo tempo por devs diferentes, pois só se conectam na feature 4.4 (cálculo de pontos ao lançar).

---

## 8. Decisões Técnicas

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| ORM | Prisma | Type-safe, schema declarativo, DX excelente com Next.js |
| Queries complexas | `prisma.$queryRaw` para agregações do dashboard, Prisma Client para CRUDs | Melhor dos dois mundos |
| Auth admin | NextAuth Credentials + bcrypt | Requisito (sem OAuth) |
| Auth vendedor | Token UUID na URL (`/launch/{token}`) | Sem login, link compartilhável |
| Gráficos | Recharts | React nativo, composable, boa docs |
| Tipo gráfico por KPI | Enum `ChartType` no schema Prisma | Admin escolhe na criação do KPI |
| Cálculo pontos | Server-side ao salvar entry | Evita triggers no banco |
| Multi-tenant | `companyId` em todos os models | Row-level isolation |
| Projeção | Calculada em runtime | Baseada em dias úteis restantes |
| Supabase + Prisma | `DATABASE_URL` com PgBouncer, `DIRECT_URL` sem | Migrations exigem conexão direta |

---

## 9. Configuração Prisma + Supabase

### `.env`
```env
DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:5432/postgres"
NEXTAUTH_SECRET="gerar-com-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

### Comandos Essenciais
```bash
npx prisma db push            # Aplica schema (dev rápido)
npx prisma migrate dev        # Cria migration (quando estabilizar)
npx prisma generate           # Gera client tipado
npx prisma db seed            # Popula dados demo
npx prisma studio             # UI visual do banco (debug)
```

### `lib/prisma.ts`
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## 10. Riscos & Mitigações

| Risco | Prob. | Impacto | Mitigação |
|-------|-------|---------|-----------|
| Heatmaps complexos demais | Alta | Médio | Estão no Dia 5; fallback: bar chart simples |
| Projeção com feriados | Média | Baixo | V1 com dias corridos (Dia 3), refinamento no Dia 5 |
| Queries agregadas lentas | Média | Alto | Índices no schema; `$queryRaw` com SQL otimizado se necessário |
| Gamificação ampla | Alta | Médio | Priorizar regras + ranking. Níveis/badges são nice-to-have |
| Prisma com PgBouncer | Média | Alto | `directUrl` para migrations, `url` com `?pgbouncer=true` para runtime |
| Conflitos de merge | Baixa | Baixo | Features por domínio, CRUDs independentes |

---

## 11. Definição de "Pronto" (MVP)

O MVP está pronto quando:

1. Admin faz login e acessa dashboard
2. Admin cadastra: unidades, setores, equipes, vendedores, KPIs
3. Admin escolhe tipo de gráfico por KPI (mínimo 3: linha, barra, área)
4. Vendedor acessa link único e lança dados
5. Dashboard exibe dados reais: comparativo, rankings, atingimento
6. Gráfico Meta x Realizado cumulativo funciona
7. Pelo menos 1 campanha configurável com regras e ranking
8. Filtros de data e vendedor funcionam no dashboard

### Backlog Futuro
- Análise por IA nos gráficos
- Notificações/lembretes de preenchimento (push/email)
- Export de relatórios (PDF/Excel)
- Dashboard mobile nativo
- Multi-idioma
- Permissões granulares por setor
- Drag-and-drop na reordenação de KPIs
