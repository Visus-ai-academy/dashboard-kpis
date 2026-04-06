import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  date: z.string().min(1, "Data é obrigatória"),
  description: z.string().optional(),
  unitId: z.string().optional().nullable(),
  includeSaturday: z.boolean().optional().default(false),
  includeSunday: z.boolean().optional().default(false),
});

// GET /api/non-working-days
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
      where.OR = [{ unitId }, { unitId: null }];
    }

    const nonWorkingDays = await prisma.nonWorkingDay.findMany({
      where,
      include: { unit: { select: { id: true, name: true } } },
      orderBy: { date: "asc" },
    });

    const serialized = nonWorkingDays.map((d) => ({
      id: d.id,
      date: d.date.toISOString().split("T")[0],
      description: d.description,
      unitId: d.unitId,
      unitName: d.unit?.name ?? null,
      includeSaturday: d.includeSaturday,
      includeSunday: d.includeSunday,
    }));

    return NextResponse.json({ success: true, data: serialized });
  } catch (error) {
    console.error("GET /api/non-working-days error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}

// POST /api/non-working-days
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
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados inválidos" } },
        { status: 400 }
      );
    }

    const { date, description, unitId, includeSaturday, includeSunday } = parsed.data;

    const nonWorkingDay = await prisma.nonWorkingDay.create({
      data: {
        companyId: session.user.companyId,
        unitId: unitId || null,
        date: new Date(date),
        description: description || null,
        includeSaturday,
        includeSunday,
      },
      include: { unit: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: nonWorkingDay.id,
        date: nonWorkingDay.date.toISOString().split("T")[0],
        description: nonWorkingDay.description,
        unitId: nonWorkingDay.unitId,
        unitName: nonWorkingDay.unit?.name ?? null,
        includeSaturday: nonWorkingDay.includeSaturday,
        includeSunday: nonWorkingDay.includeSunday,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/non-working-days error:", error);

    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE", message: "Já existe um feriado cadastrado para esta data nesta unidade" } },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}

// DELETE /api/non-working-days
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "ID é obrigatório" } },
        { status: 400 }
      );
    }

    const existing = await prisma.nonWorkingDay.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Feriado não encontrado" } },
        { status: 404 }
      );
    }

    await prisma.nonWorkingDay.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/non-working-days error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } },
      { status: 500 }
    );
  }
}
