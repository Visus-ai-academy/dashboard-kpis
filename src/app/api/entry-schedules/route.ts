import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { entryScheduleCreateSchema } from "@/lib/validators/entry-schedule";

// ────────────────────────────────────────────────────────────
// GET /api/entry-schedules
// ────────────────────────────────────────────────────────────

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
    const unitId = searchParams.get("unitId");

    const where: Record<string, unknown> = { companyId: session.user.companyId };
    if (unitId) {
      where.kpi = { OR: [{ unitId }, { unitId: null }] };
    }

    const schedules = await prisma.entrySchedule.findMany({
      where,
      include: {
        kpi: { select: { id: true, name: true, type: true, periodicity: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: schedules });
  } catch (error) {
    console.error("GET /api/entry-schedules error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────────────
// POST /api/entry-schedules
// ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = entryScheduleCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados inválidos" } },
        { status: 400 }
      );
    }

    // Validate KPI belongs to company
    const kpi = await prisma.kpi.findFirst({
      where: { id: parsed.data.kpiId, companyId: session.user.companyId },
    });

    if (!kpi) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "KPI não encontrado" } },
        { status: 404 }
      );
    }

    // Check if schedule already exists for this KPI
    const existing = await prisma.entrySchedule.findFirst({
      where: { kpiId: parsed.data.kpiId, companyId: session.user.companyId },
    });

    let schedule;
    if (existing) {
      // Update existing
      schedule = await prisma.entrySchedule.update({
        where: { id: existing.id },
        data: {
          frequency: parsed.data.frequency,
          deadlineTime: parsed.data.deadlineTime ?? null,
          reminderEnabled: parsed.data.reminderEnabled ?? false,
        },
        include: {
          kpi: { select: { id: true, name: true, type: true, periodicity: true } },
        },
      });
    } else {
      schedule = await prisma.entrySchedule.create({
        data: {
          companyId: session.user.companyId,
          kpiId: parsed.data.kpiId,
          frequency: parsed.data.frequency,
          deadlineTime: parsed.data.deadlineTime ?? null,
          reminderEnabled: parsed.data.reminderEnabled ?? false,
        },
        include: {
          kpi: { select: { id: true, name: true, type: true, periodicity: true } },
        },
      });
    }

    return NextResponse.json(
      { success: true, data: schedule },
      { status: existing ? 200 : 201 }
    );
  } catch (error) {
    console.error("POST /api/entry-schedules error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
