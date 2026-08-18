"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@reinado/supabase-client";

export default function AuthCallbackPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const client = getSupabaseBrowserClient();
      const code = new URLSearchParams(window.location.search).get("code");

      if (code) {
        const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (!cancelled) setError("No pudimos completar el acceso con Google. Vuelve a intentarlo.");
          return;
        }
      }

      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError || !data.session) {
        if (!cancelled) setError("La sesión de Google no llegó a la web. Vuelve a intentarlo.");
        return;
      }

      window.location.replace(`${window.location.origin}/`);
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#030a16", color: "#fff9ec", textAlign: "center" }}>
      <div>
        <p style={{ color: "#f2d582", letterSpacing: ".16em", fontSize: 11, textTransform: "uppercase" }}>Reinado 2026</p>
        <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400 }}>{error || "Completando tu acceso…"}</h1>
        {error && <a href="/" style={{ color: "#f2d582" }}>Volver a intentar</a>}
      </div>
    </main>
  );
}
