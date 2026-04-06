import { type NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

// ────────────────────────────────────────────────────────────
// Custom role type that extends Prisma UserRole with SELLER
// ────────────────────────────────────────────────────────────

export type AppRole = UserRole | "SELLER";

// ────────────────────────────────────────────────────────────
// NextAuth type augmentation
// ────────────────────────────────────────────────────────────

declare module "next-auth" {
  interface User {
    id: string;
    companyId: string;
    name: string;
    email: string;
    role: AppRole;
    sellerId?: string;
    teamName?: string;
  }

  interface Session {
    user: {
      id: string;
      companyId: string;
      name: string;
      email: string;
      role: AppRole;
      sellerId?: string;
      teamName?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    companyId: string;
    role: AppRole;
    sellerId?: string;
    teamName?: string;
  }
}

// ────────────────────────────────────────────────────────────
// Auth options
// ────────────────────────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    // ── Admin / Manager credentials ──
    CredentialsProvider({
      id: "admin-credentials",
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email ou senha incorretos");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            companyId: true,
            email: true,
            name: true,
            role: true,
            passwordHash: true,
            isActive: true,
          },
        });

        if (!user || !user.isActive) {
          throw new Error("Email ou senha incorretos");
        }

        const passwordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!passwordValid) {
          throw new Error("Email ou senha incorretos");
        }

        return {
          id: user.id,
          companyId: user.companyId,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),

    // ── Seller credentials (email + senha) ──
    CredentialsProvider({
      id: "seller-credentials",
      name: "Vendedor",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("E-mail ou senha incorretos");
        }

        const seller = await prisma.seller.findFirst({
          where: {
            email: { equals: credentials.email, mode: "insensitive" },
          },
          select: {
            id: true,
            companyId: true,
            name: true,
            email: true,
            passwordHash: true,
            isActive: true,
            team: { select: { name: true } },
          },
        });

        if (!seller || !seller.isActive || !seller.passwordHash) {
          throw new Error("E-mail ou senha incorretos");
        }

        const passwordValid = await bcrypt.compare(
          credentials.password,
          seller.passwordHash
        );

        if (!passwordValid) {
          throw new Error("E-mail ou senha incorretos");
        }

        return {
          id: seller.id,
          companyId: seller.companyId,
          name: seller.name,
          email: seller.email ?? "",
          role: "SELLER" as const,
          sellerId: seller.id,
          teamName: seller.team?.name ?? undefined,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.companyId = user.companyId;
        token.role = user.role;
        token.sellerId = user.sellerId;
        token.teamName = user.teamName;
      }
      return token;
    },

    async session({ session, token }) {
      session.user = {
        id: token.id,
        companyId: token.companyId,
        name: token.name ?? "",
        email: token.email ?? "",
        role: token.role,
        sellerId: token.sellerId,
        teamName: token.teamName,
      };
      return session;
    },
  },
};

// ────────────────────────────────────────────────────────────
// Helper: validated session getter for server-side usage
// ────────────────────────────────────────────────────────────

export async function getAuthSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    throw new Error("Sessao invalida ou expirada");
  }

  return session;
}
