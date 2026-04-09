export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#112622] flex-col justify-between p-12">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <span className="text-lg font-bold text-white">V</span>
            </div>
            <span className="text-xl font-semibold text-white tracking-tight">Visus</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight tracking-tight">
            Gestão inteligente<br />
            <span className="text-[#6DB8A5]">para sua equipe.</span>
          </h1>
          <p className="text-white/60 text-lg max-w-md leading-relaxed">
            Acompanhe KPIs, gerencie vendedores e tome decisões baseadas em dados reais.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-white/30 text-sm">
            Visus Dashboard v1.0
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-[#f8fbfa] px-6">
        {children}
      </div>
    </div>
  );
}
