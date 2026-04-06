import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators/register";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s-]/g, "") // remove special chars
    .trim()
    .replace(/\s+/g, "-") // spaces to hyphens
    .replace(/-+/g, "-"); // collapse multiple hyphens
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: firstError.message,
          },
        },
        { status: 400 }
      );
    }

    const { companyName, name, email, password } = parsed.data;

    // Check duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMAIL_EXISTS",
            message: "Este e-mail já está em uso",
          },
        },
        { status: 409 }
      );
    }

    // Generate and check slug
    const slug = generateSlug(companyName);

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_COMPANY_NAME",
            message: "Nome da empresa inválido",
          },
        },
        { status: 400 }
      );
    }

    const existingCompany = await prisma.company.findUnique({
      where: { slug },
    });

    if (existingCompany) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "COMPANY_EXISTS",
            message:
              "Já existe uma empresa com este nome. Tente um nome diferente.",
          },
        },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create company and user in a transaction
    await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
          slug,
        },
      });

      await tx.user.create({
        data: {
          companyId: company.id,
          email,
          passwordHash,
          name,
          role: "ADMIN",
        },
      });
    });

    return NextResponse.json(
      { success: true, data: { message: "Conta criada com sucesso" } },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Erro interno do servidor",
        },
      },
      { status: 500 }
    );
  }
}
