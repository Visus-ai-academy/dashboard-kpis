"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("admin-credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result?.error) {
        router.push(callbackUrl);
        router.refresh();
        return;
      }

      setError("E-mail ou senha incorretos");
    } catch {
      setError("Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      {/* Logo — visible only on mobile */}
      <div className="flex flex-col items-center gap-3 lg:hidden">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#112622]">
          <span className="text-xl font-bold text-white">V</span>
        </div>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#112622] tracking-tight">
          Bem-vindo de volta
        </h2>
        <p className="text-[#6D8C84] text-sm">
          Entre com suas credenciais para acessar o painel.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium text-[#34594F]">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="w-full rounded-xl border border-[#C1D9D4] bg-white px-4 py-3 text-sm text-[#112622] placeholder:text-[#6D8C84]/40 outline-none transition-all focus:border-[#34594F] focus:ring-2 focus:ring-[#34594F]/15 disabled:opacity-50"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs font-medium text-[#34594F]">
            Senha
          </label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="w-full rounded-xl border border-[#C1D9D4] bg-white px-4 py-3 text-sm text-[#112622] placeholder:text-[#6D8C84]/40 outline-none transition-all focus:border-[#34594F] focus:ring-2 focus:ring-[#34594F]/15 disabled:opacity-50"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5">
            <p className="text-xs text-red-600 text-center">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#112622] px-4 py-3 text-sm font-medium text-white transition-all hover:bg-[#1a3a33] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Entrando...
            </>
          ) : (
            <>
              <LogIn className="size-4" />
              Entrar
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <p className="text-center text-[10px] text-[#6D8C84]/50">
        Visus Dashboard — Todos os direitos reservados
      </p>
    </div>
  );
}

function LoginSkeleton() {
  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-52 rounded-lg bg-[#C1D9D4]/30 animate-pulse" />
        <div className="h-4 w-72 rounded-lg bg-[#C1D9D4]/20 animate-pulse" />
      </div>
      <div className="space-y-5">
        <div className="h-12 w-full rounded-xl bg-[#C1D9D4]/20 animate-pulse" />
        <div className="h-12 w-full rounded-xl bg-[#C1D9D4]/20 animate-pulse" />
        <div className="h-12 w-full rounded-xl bg-[#C1D9D4]/30 animate-pulse" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
