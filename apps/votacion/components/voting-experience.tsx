"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@reinado/supabase-client";
import type { Candidate, VoteResponse, VotingConfig } from "@reinado/types";
import { getVotingPhase } from "@reinado/validation";

const demoCandidates: Candidate[] = [
  { id: "86291858-b6be-4dce-b38e-ce902bc68531", nombre_completo: "Valentina Reyes", apodo_o_titulo: "La voz de la costa", edad: 21, descripcion: "Creo en el poder de la cultura para transformar comunidades. Mi propósito es abrir más espacios donde el arte, la memoria y el talento joven puedan encontrarse.", foto_principal_url: null, galeria_urls: [], video_url: null, video_poster_url: null, representa_a: "Sede Central", orden: 1, activa: true },
  { id: "8f5987ad-68e7-4bc4-b0b3-1c5b837af4f0", nombre_completo: "Camila del Mar", apodo_o_titulo: "Elegancia que inspira", edad: 20, descripcion: "Sueño con una comunidad donde cada joven pueda expresarse con seguridad. Represento la alegría, la disciplina y la fuerza de quienes trabajan por sus metas.", foto_principal_url: null, galeria_urls: [], video_url: null, video_poster_url: null, representa_a: "Sede Norte", orden: 2, activa: true },
  { id: "d3e0ad84-fca1-46b0-a6c7-59404532c8c7", nombre_completo: "Luciana Flores", apodo_o_titulo: "Tradición en movimiento", edad: 22, descripcion: "Llevo conmigo las historias de mi comunidad y una visión fresca del liderazgo: escuchar primero, unir talentos y convertir buenas ideas en acciones.", foto_principal_url: null, galeria_urls: [], video_url: null, video_poster_url: null, representa_a: "Sede Sur", orden: 3, activa: true }
];

const demoConfig: VotingConfig = {
  id: 1, nombre_evento: "Reinado 2026", fecha_inicio: null, fecha_fin: null,
  mensaje_antes: "La corona espera. Muy pronto podrás elegir a tu favorita.",
  mensaje_despues: "Gracias por celebrar con nosotros.",
  modo_acceso: "codigo", google_login_activo: false, dominio_correo_permitido: null,
  mostrar_contador: false, mostrar_resultados: false, color_primario: "#d6aa4b", color_acento: "#751f3f"
};

export function VotingExperience() {
  const [candidates, setCandidates] = useState<Candidate[]>(demoCandidates);
  const [config, setConfig] = useState<VotingConfig>(demoConfig);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [profile, setProfile] = useState<Candidate | null>(null);
  const configured = isSupabaseConfigured();
  const [hasVoted, setHasVoted] = useState(() => typeof window !== "undefined" && localStorage.getItem("reinado:voted") === "true");
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) return;
    const client = getSupabaseBrowserClient();
    void client.auth.getSession().then(async ({ data }) => {
      if (!data.session) await client.auth.signInAnonymously();
      const [candidateResult, configResult, voteResult] = await Promise.all([
        client.from("candidatas").select("*").eq("activa", true).order("orden"),
        client.from("configuracion_votacion").select("*").eq("id", 1).single(),
        client.from("votos").select("id").limit(1)
      ]);
      if (candidateResult.data) setCandidates(candidateResult.data as Candidate[]);
      if (configResult.data) setConfig(configResult.data as VotingConfig);
      if (voteResult.data?.length) {
        setHasVoted(true);
        localStorage.setItem("reinado:voted", "true");
      }
      setLoading(false);
    });
  }, [configured]);

  const phase = useMemo(() => getVotingPhase(config.fecha_inicio, config.fecha_fin), [config]);

  return (
    <main className="public-shell" style={{ "--event-gold": config.color_primario, "--event-accent": config.color_acento } as React.CSSProperties}>
      <header className="public-header">
        <a href="#inicio" className="public-brand"><span>♛</span><div><strong>REINADO</strong><small>MMXXVI</small></div></a>
        <nav><a href="#candidatas">Candidatas</a><a href="#como-votar">Cómo votar</a><span className={`live-pill ${phase === "open" ? "is-live" : ""}`}>{phase === "open" ? "Votación abierta" : "Votación cerrada"}</span></nav>
      </header>

      <section className="hero" id="inicio">
        <div className="ornament ornament--left">✦</div><div className="ornament ornament--right">✦</div>
        <motion.div className="hero__content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }}>
          <p className="gold-kicker">UNA NOCHE · UNA CORONA · TU ELECCIÓN</p>
          <span className="hero-crown">♛</span>
          <h1>Tu voto.<br/><em>Tu reina.</em></h1>
          <p className="hero__lead">Conoce sus historias, descubre lo que representan y elige a quien llevará la corona.</p>
          {hasVoted ? (
            <div className="hero-status hero-status--success"><span>✓</span><div><strong>Tu voto ya fue registrado</strong><small>Gracias por ser parte de esta celebración.</small></div></div>
          ) : phase === "open" ? (
            <a className="royal-button" href="#candidatas">Conocer candidatas <span>↓</span></a>
          ) : (
            <div className="hero-status"><span>◷</span><div><strong>La votación está cerrada</strong><small>{config.mensaje_antes}</small></div></div>
          )}
        </motion.div>
        <div className="hero__seal"><span>2026</span><small>EDICIÓN</small></div>
      </section>

      <section className="candidates-section" id="candidatas">
        <div className="section-intro">
          <p className="gold-kicker">ELLAS INSPIRAN</p>
          <h2>Conoce a las candidatas</h2>
          <p>Cada historia merece ser escuchada. Abre un perfil para conocer su esencia.</p>
        </div>
        {loading ? <div className="candidate-stack"><div className="candidate-card skeleton" /></div> : (
          <div className="candidate-stack">
            {candidates.map((candidate, index) => (
              <CandidateCard key={candidate.id} candidate={candidate} index={index} canVote={phase === "open" && !hasVoted} onProfile={setProfile} onVote={setSelected} />
            ))}
          </div>
        )}
      </section>

      <section className="how-section" id="como-votar">
        <div className="section-intro section-intro--light"><p className="gold-kicker">SIMPLE Y SEGURO</p><h2>Tu elección en tres pasos</h2></div>
        <div className="steps">
          <article><span>01</span><i>♛</i><h3>Conoce</h3><p>Explora los perfiles, historias y propuestas de cada candidata.</p></article>
          <article><span>02</span><i>◇</i><h3>Elige</h3><p>Decide con calma. Tu voto es único y definitivo.</p></article>
          <article><span>03</span><i>✓</i><h3>Confirma</h3><p>Ingresa el código que recibiste y confirma de forma segura.</p></article>
        </div>
        <p className="privacy-note">◉ Tu código se usa una sola vez. No almacenamos tu IP visible.</p>
      </section>

      <footer><div className="public-brand"><span>♛</span><div><strong>REINADO</strong><small>MMXXVI</small></div></div><p>Una celebración de talento, propósito y comunidad.</p><small>Votación protegida con código único y Cloudflare Turnstile.</small></footer>

      <AnimatePresence>
        {profile && <ProfileModal candidate={profile} canVote={phase === "open" && !hasVoted} onClose={() => setProfile(null)} onVote={() => { setSelected(profile); setProfile(null); }} />}
        {selected && <VoteModal candidate={selected} configured={configured} onClose={() => setSelected(null)} onSuccess={() => { setHasVoted(true); setSelected(null); }} />}
      </AnimatePresence>
    </main>
  );
}

function CandidateCard({ candidate, index, canVote, onProfile, onVote }: { candidate: Candidate; index: number; canVote: boolean; onProfile: (candidate: Candidate) => void; onVote: (candidate: Candidate) => void }) {
  const reduced = useReducedMotion();
  return (
    <motion.article className="candidate-card" initial={reduced ? false : { opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-10%" }} transition={{ delay: index * .08 }}>
      <Portrait candidate={candidate} index={index} />
      <div className="candidate-card__content">
        <p className="gold-kicker">{candidate.representa_a}</p>
        <h3>{candidate.nombre_completo}</h3>
        <em>{candidate.apodo_o_titulo}</em>
        <p>{candidate.descripcion}</p>
        <div className="candidate-card__actions"><button className="text-button" onClick={() => onProfile(candidate)}>Ver su historia <span>→</span></button>{canVote && <button className="vote-icon" aria-label={`Votar por ${candidate.nombre_completo}`} onClick={() => onVote(candidate)}>♛</button>}</div>
      </div>
      <span className="candidate-number">0{index + 1}</span>
    </motion.article>
  );
}

function Portrait({ candidate, index }: { candidate: Candidate; index: number }) {
  if (candidate.foto_principal_url) return <div className="candidate-card__portrait"><Image src={candidate.foto_principal_url} alt={candidate.nombre_completo} fill sizes="(max-width: 720px) 100vw, 420px" style={{ objectFit: "cover" }} /></div>;
  return <div className={`candidate-card__portrait generated-portrait generated-portrait--${(index % 3) + 1}`} role="img" aria-label={`Retrato decorativo de ${candidate.nombre_completo}`}><div className="portrait-silhouette" /><span>{candidate.nombre_completo.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span></div>;
}

function ProfileModal({ candidate, canVote, onClose, onVote }: { candidate: Candidate; canVote: boolean; onClose: () => void; onVote: () => void }) {
  return (
    <motion.div className="public-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.article className="profile-modal" initial={{ scale: .96, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96 }} onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="Cerrar">×</button>
        <Portrait candidate={candidate} index={0} />
        <div className="profile-modal__content"><p className="gold-kicker">{candidate.representa_a}</p><h2>{candidate.nombre_completo}</h2><em>{candidate.apodo_o_titulo}</em><blockquote>“{candidate.descripcion}”</blockquote><div className="profile-tags"><span>Propósito</span><span>Comunidad</span><span>Talento</span></div>{canVote && <button className="royal-button" onClick={onVote}>Votar por ella ♛</button>}</div>
      </motion.article>
    </motion.div>
  );
}

function VoteModal({ candidate, configured, onClose, onSuccess }: { candidate: Candidate; configured: boolean; onClose: () => void; onSuccess: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VoteResponse | null>(null);

  const submit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    if (!configured) {
      setResult({ ok: false, code: "VOTACION_CERRADA", message: "La infraestructura aún no está conectada y no se registró ningún voto." });
      setBusy(false);
      return;
    }
    const client = getSupabaseBrowserClient();
    const turnstileToken = (document.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]')?.value ?? "");
    const { data, error } = await client.functions.invoke("emitir-voto", { body: { candidataId: candidate.id, codigo: code, turnstileToken } });
    const response = (data ?? { ok: false, code: "ERROR", message: error?.message ?? "No pudimos registrar el voto." }) as VoteResponse;
    setResult(response);
    setBusy(false);
    if (response.ok) {
      localStorage.setItem("reinado:voted", "true");
      confetti({ particleCount: 130, spread: 75, colors: ["#d6aa4b", "#fff3c4", "#751f3f"], origin: { y: .7 } });
      setTimeout(onSuccess, 1500);
    }
  }, [candidate.id, code, configured, onSuccess]);

  return (
    <motion.div className="public-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.form className="vote-modal" initial={{ scale: .95, y: 22 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .95 }} onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="close-button" onClick={onClose} aria-label="Cerrar">×</button>
        <span className="vote-crown">♛</span>
        <p className="gold-kicker">CONFIRMA TU ELECCIÓN</p>
        <h2>Tu voto es definitivo</h2>
        <div className="chosen-candidate"><div>{candidate.nombre_completo.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><span><small>HAS ELEGIDO A</small><strong>{candidate.nombre_completo}</strong></span></div>
        <label>Código único de votación<input autoFocus autoComplete="one-time-code" placeholder="REY-XXXX-XXXX-XXXX" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} required minLength={10} /></label>
        <p className="code-help">Lo encontrarás en la invitación que recibiste. Solo puede usarse una vez.</p>
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? <TurnstileWidget siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} /> : <div className="turnstile-placeholder">Turnstile se activará en producción</div>}
        {result && <p className={result.ok ? "vote-result vote-result--ok" : "vote-result"}>{result.message}</p>}
        <button className="royal-button royal-button--wide" disabled={busy}>{busy ? "Verificando…" : "Confirmar mi voto"} <span>♛</span></button>
        <p className="secure-caption">◉ Operación cifrada · Tu código nunca se muestra públicamente</p>
      </motion.form>
    </motion.div>
  );
}

function TurnstileWidget({ siteKey }: { siteKey: string }) {
  useEffect(() => {
    if (document.querySelector('script[src*="turnstile"]')) return;
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);
  return <div className="cf-turnstile" data-sitekey={siteKey} data-theme="light" data-size="flexible" />;
}
