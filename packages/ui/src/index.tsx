import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from "react";

export function CrownMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-mark" aria-label="Reinado 2026">
      <span aria-hidden="true">♛</span>
      {!compact && <strong>REINADO</strong>}
    </div>
  );
}

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`button ${className}`} {...props} />;
}

export function Badge({ children, tone = "gold" }: PropsWithChildren<{ tone?: "gold" | "green" | "wine" | "muted" }>) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function SectionHeading({ eyebrow, title, aside }: { eyebrow: string; title: string; aside?: ReactNode }) {
  return (
    <header className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {aside}
    </header>
  );
}

export function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon" aria-hidden="true">{icon}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
