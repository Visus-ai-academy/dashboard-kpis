import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { entryScheduleUpdateSchema } from "@/lib/validators/entry-schedule";

// ────────────────────────────────────────────────────────────
// PUT /api/entry-schedules/[id]
// ────────────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = entryScheduleUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados inválidos" } },
        { status: 400 }
      );
    }

    const existing = await prisma.entrySchedule.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Configuração não encontrada" } },
        { status: 404 }
      );
    }

    const schedule = await prisma.entrySchedule.update({
      where: { id },
      data: {
        frequency: parsed.data.frequency,
        deadlineTime: parsed.data.deadlineTime ?? existing.deadlineTime,
        reminderEnabled: parsed.data.reminderEnabled ?? existing.reminderEnabled,
      },
      include: {
        kpi: { select: { id: true, name: true, type: true, periodicity: true } },
      },
    });

    return NextResponse.json({ success: true, data: schedule });
  } catch (error) {
    console.error("PUT /api/entry-schedules/[id] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────────────
// DELETE /api/entry-schedules/[id]
// ────────────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      );
    }

    const { id } = await params;

    const existing = await prisma.entrySchedule.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Configuração não encontrada" } },
        { status: 404 }
      );
    }

    await prisma.entrySchedule.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("DELETE /api/entry-schedules/[id] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
