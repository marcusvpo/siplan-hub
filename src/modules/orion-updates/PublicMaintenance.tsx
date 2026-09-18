import { appPath } from "./paths";
import { BlogSignature } from "./BlogSignature";

interface PublicMaintenanceProps {
  title?: string;
  message?: string;
}

export function PublicMaintenance({
  title = "Estamos em manutenção",
  message = "O Orion Blog está passando por melhorias no momento. Voltaremos em breve.",
}: PublicMaintenanceProps) {
  return (
    <div className="page maintenance-page">
      <header className="topbar">
        <div className="container topbar-row reader-topbar-row">
          <div className="brand-title">
            <img src={appPath("/assets/Siplan_logo.png")} alt="Logo Siplan" />
            <div>
              <h1>Orion Blog</h1>
              <p>Acompanhe as novidades dos sistemas</p>
            </div>
          </div>
          <BlogSignature />
        </div>
      </header>

      <main className="container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <div className="mx-auto max-w-lg rounded-2xl border border-border/60 bg-card p-8 shadow-xl backdrop-blur-sm">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <svg
              className="h-10 w-10 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="1.8"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l5.654-4.654m0 0a4.992 4.992 0 011.077-1.12l4.898-3.414M8.18 10.93a4.992 4.992 0 00-1.12 1.077" />
            </svg>
          </div>

          <span className="inline-flex items-center rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-4">
            Em Manutenção
          </span>

          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl mb-3">
            {title}
          </h2>

          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6">
            {message}
          </p>

          <div className="pt-4 border-t border-border/40 text-xs text-muted-foreground">
            Agradecemos a sua compreensão. Em caso de urgência, entre em contato com o suporte Siplan.
          </div>
        </div>
      </main>
    </div>
  );
}
