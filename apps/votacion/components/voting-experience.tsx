"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, animate, motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@reinado/supabase-client";
import type { Candidate, VoteResponse, VotingConfig } from "@reinado/types";
import { getVotingPhase } from "@reinado/validation";
import { normalizeModuleReferences } from "../lib/normalize-module";

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

type PublicResult = { candidata_id: string; nombre_completo: string; votos: number; porcentaje: number };

export function VotingExperience() {
  const [candidates, setCandidates] = useState<Candidate[]>(demoCandidates);
  const [config, setConfig] = useState<VotingConfig>(demoConfig);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [profile, setProfile] = useState<Candidate | null>(null);
  const [profileTrigger, setProfileTrigger] = useState<HTMLButtonElement | null>(null);
  const configured = isSupabaseConfigured();
  const [hasVoted, setHasVoted] = useState(() => typeof window !== "undefined" && localStorage.getItem("reinado:voted") === "true");
  const [loading, setLoading] = useState(configured);
  const [access, setAccess] = useState<"none" | "anonymous" | "google">("none");
  const [now, setNow] = useState(() => new Date());
  const [publicResults, setPublicResults] = useState<PublicResult[]>([]);
  const previewHandled = useRef(false);

  useEffect(() => {
    if (!configured) return;
    const client = getSupabaseBrowserClient();
    let active = true;
    const applySession = (session: Awaited<ReturnType<typeof client.auth.getSession>>["data"]["session"]) => {
      if (!active) return;
      const user = session?.user;
      const hasGoogleIdentity = user?.identities?.some((identity) => identity.provider === "google") ?? false;
      // En algunos navegadores móviles la sesión inicial llega sin `identities`.
      // Este sitio solo ofrece acceso público mediante Google; el backend valida la identidad al votar.
      const isGoogleUser = Boolean(user && !user.is_anonymous && (user.app_metadata?.provider === "google" || hasGoogleIdentity || !user.app_metadata?.provider));
      setAccess(isGoogleUser ? "google" : user ? "anonymous" : "none");
    };
    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    void (async () => {
      const callbackCode = new URLSearchParams(window.location.search).get("code");
      if (callbackCode) {
        const { error: exchangeError } = await client.auth.exchangeCodeForSession(callbackCode);
        if (!exchangeError) window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.hash}`);
      }
      const [candidateResult, configResult] = await Promise.all([
        client.from("candidatas").select("*").eq("activa", true).order("orden"),
        client.from("configuracion_votacion").select("*").eq("id", 1).single()
      ]);
      if (candidateResult.data) setCandidates(candidateResult.data as Candidate[]);
      const loadedConfig = (configResult.data as VotingConfig | null) ?? demoConfig;
      setConfig(loadedConfig);
      let { data: sessionData } = await client.auth.getSession();
      if (loadedConfig.modo_acceso === "codigo" && !sessionData.session) {
        const signedIn = await client.auth.signInAnonymously();
        sessionData = { session: signedIn.data.session };
      }
      const user = sessionData.session?.user;
      applySession(sessionData.session);
      const voteResult = user ? await client.from("votos").select("id").limit(1) : { data: null };
      if (voteResult.data?.length) {
        setHasVoted(true);
        localStorage.setItem("reinado:voted", "true");
      }
      if (loadedConfig.mostrar_resultados) {
        const result = await client.functions.invoke("resultados-publicos");
        const rows = (result.data as { resultados?: PublicResult[] } | null)?.resultados;
        if (rows) setPublicResults(rows);
      }
      setLoading(false);
    })();

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [configured]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (previewHandled.current) return;
    const candidateId = new URLSearchParams(window.location.search).get("candidata");
    if (!candidateId) {
      previewHandled.current = true;
      return;
    }
    const candidate = candidates.find((item) => item.id === candidateId);
    if (candidate) {
      previewHandled.current = true;
      queueMicrotask(() => setProfile(candidate));
    }
  }, [candidates]);

  const phase = useMemo(() => getVotingPhase(config.fecha_inicio, config.fecha_fin, now), [config, now]);
  const requiresGoogle = config.google_login_activo && (config.modo_acceso === "google" || config.modo_acceso === "google_codigo");
  const accessReady = !requiresGoogle || access === "google";
  const phaseMessage = phase === "finished" ? config.mensaje_despues : config.mensaje_antes;
  const closeProfile = useCallback(() => setProfile(null), []);
  const closeVote = useCallback(() => setSelected(null), []);
  const voteFromProfile = useCallback(() => {
    if (!profile) return;
    setSelected(profile);
    setProfile(null);
  }, [profile]);
  const completeVote = useCallback(() => {
    setHasVoted(true);
    setSelected(null);
  }, []);
  const openProfile = useCallback((candidate: Candidate, trigger: HTMLButtonElement) => {
    setProfileTrigger(trigger);
    setProfile(candidate);
  }, []);

  async function signInWithGoogle() {
    if (!configured) return;
    await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` }
    });
  }

  return (
    <main className="public-shell" style={{ "--event-gold": config.color_primario, "--event-accent": config.color_acento } as React.CSSProperties}>
      <RoyalBackdrop />
      <RoyalScrollProgress />
      <header className="public-header">
        <a href="#inicio" className="public-brand"><span>♛</span><div><strong>{config.nombre_evento.toUpperCase()}</strong><small>MMXXVI</small></div></a>
        <nav><a href="#candidatas">Candidatas</a><a href="#como-votar">Cómo votar</a><span className={`live-pill ${phase === "open" ? "is-live" : ""}`}>{phase === "open" ? "Votación abierta" : "Votación cerrada"}</span></nav>
      </header>

      <section className="hero" id="inicio">
        <div className="ornament ornament--left">✦</div><div className="ornament ornament--right">✦</div>
        <motion.div className="hero__content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }}>
          <p className="gold-kicker">UNA NOCHE · UNA CORONA · TU ELECCIÓN</p>
          <AnniversaryCounter />
          <span className="hero-crown">♛</span>
          <h1>Tu voto.<br/><em>Tu reina.</em></h1>
          <p className="hero__lead">Conoce sus historias, descubre lo que representan y elige a quien llevará la corona.</p>
          {hasVoted ? (
            <div className="hero-status hero-status--success"><span>✓</span><div><strong>Tu voto ya fue registrado</strong><small>Gracias por ser parte de esta celebración.</small></div></div>
          ) : phase === "upcoming" && config.fecha_inicio ? (
            <Countdown target={config.fecha_inicio} now={now} />
          ) : phase === "open" && requiresGoogle && !accessReady ? (
            <button className="royal-button" onClick={() => void signInWithGoogle()}>Continuar con Google <span>G</span></button>
          ) : phase === "open" ? (
            <a className="royal-button" href="#candidatas">Conocer candidatas <span>↓</span></a>
          ) : (
            <div className="hero-status"><span>◷</span><div><strong>{phase === "finished" ? "La votación ha finalizado" : "La votación está cerrada"}</strong><small>{phaseMessage}</small></div></div>
          )}
        </motion.div>
      </section>

      <section className="candidates-section" id="candidatas">
        <FallingRoyalLines />
        <div className="section-crown" aria-hidden="true"><span>✦</span><strong>♛</strong><span>✦</span></div>
        <motion.div className="section-intro" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-15%" }} transition={{ duration: .65 }}>
          <p className="gold-kicker">ELLAS INSPIRAN</p>
          <h2>Conoce a las candidatas</h2>
          <p>Cada historia merece ser escuchada. Abre un perfil y encuentra el botón dorado <strong>Votar por ella</strong>.</p>
        </motion.div>
        {phase === "open" && <a className="vote-guide" href="#candidatas-list"><span>♛</span><strong>¿Dónde voto?</strong><small>Elige una candidata y pulsa “Votar por ella”</small><b>↓</b></a>}
        {loading ? <div className="candidate-stack"><div className="candidate-card skeleton" /></div> : phase === "open" && requiresGoogle && !accessReady ? (
          <div className="access-gate">
            <span>G</span>
            <h3>Acceso con Google requerido</h3>
            <p>Inicia sesión para consultar los perfiles y emitir un único voto durante este evento.</p>
            <button className="royal-button" onClick={() => void signInWithGoogle()}>Continuar con Google</button>
          </div>
        ) : candidates.length === 0 ? (
          <div className="access-gate">
            <span>♛</span>
            <h3>Próximamente conocerás a las candidatas</h3>
            <p>El equipo organizador está preparando los perfiles oficiales del evento.</p>
          </div>
        ) : (
          <div className="candidate-stack" id="candidatas-list">
            {candidates.map((candidate, index) => (
              <CandidateCard key={candidate.id} candidate={candidate} index={index} canVote={phase === "open" && !hasVoted && accessReady} onProfile={openProfile} onVote={setSelected} />
            ))}
          </div>
        )}
      </section>

      {config.mostrar_resultados && publicResults.length > 0 && (
        <section className="public-results" aria-labelledby="resultados-publicos">
          <div className="section-intro">
            <p className="gold-kicker">CONTEO PÚBLICO</p>
            <h2 id="resultados-publicos">Resultados del evento</h2>
            <p>Solo se muestran cifras agregadas; nunca identidades ni códigos.</p>
          </div>
          <div className="public-results__list">{publicResults.map((result) => (
            <article key={result.candidata_id}>
              <div><strong>{result.nombre_completo}</strong>{config.mostrar_contador && <span>{result.votos} votos</span>}</div>
              <div className="public-results__bar"><i style={{ width: `${result.porcentaje}%` }} /></div>
              <em>{result.porcentaje}%</em>
            </article>
          ))}</div>
        </section>
      )}

      <section className="how-section" id="como-votar">
        <motion.div className="section-intro section-intro--light" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-15%" }} transition={{ duration: .65 }}><p className="gold-kicker">SIMPLE Y SEGURO</p><h2>Tu elección en tres pasos</h2></motion.div>
        <motion.div className="steps" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-10%" }} variants={{ hidden: {}, visible: { transition: { staggerChildren: .14 } } }}>
          <motion.article variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}><span>01</span><i>♛</i><h3>Conoce</h3><p>Explora los perfiles, historias y propuestas de cada candidata.</p></motion.article>
          <motion.article variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}><span>02</span><i>◇</i><h3>Elige</h3><p>Decide con calma. Tu voto es único y definitivo.</p></motion.article>
          <motion.article variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}><span>03</span><i>✓</i><h3>Confirma</h3><p>{config.modo_acceso === "google" ? "Confirma tu voto con tu cuenta Google de forma segura." : "Ingresa el código que recibiste y confirma de forma segura."}</p></motion.article>
        </motion.div>
        <p className="privacy-note">◉ {config.modo_acceso === "google" ? "Tu cuenta Google permite un único voto." : "Tu código se usa una sola vez."} No almacenamos tu IP visible.</p>
      </section>

      <footer><div className="public-brand"><span>♛</span><div><strong>{config.nombre_evento.toUpperCase()}</strong><small>MMXXVI</small></div></div><p>Una celebración de talento, propósito y comunidad.</p><small>Votación protegida con {config.modo_acceso === "google" ? "Google" : "código único"} y Cloudflare Turnstile.</small></footer>

      <AnimatePresence>
        {profile && <ProfileModal candidate={profile} canVote={phase === "open" && !hasVoted && accessReady} returnFocusTarget={profileTrigger} onClose={closeProfile} onVote={voteFromProfile} />}
        {selected && <VoteModal candidate={selected} configured={configured} requiresCode={config.modo_acceso !== "google"} onClose={closeVote} onSuccess={completeVote} />}
      </AnimatePresence>
    </main>
  );
}

function RoyalBackdrop() {
  return (
    <div className="royal-background" aria-hidden="true">
      <span className="royal-glyph royal-glyph--crown">♛</span>
      <span className="royal-glyph royal-glyph--star">✦</span>
      <span className="royal-glyph royal-glyph--diamond">◇</span>
      <span className="royal-laurel royal-laurel--left">❧</span>
      <span className="royal-laurel royal-laurel--right">❧</span>
    </div>
  );
}

function AnniversaryCounter() {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (reduced) {
      const frame = window.requestAnimationFrame(() => {
        setCount(28);
        setComplete(true);
      });
      return () => window.cancelAnimationFrame(frame);
    }
    const controls = animate(0, 28, {
      delay: .2,
      duration: 1.05,
      ease: "easeOut",
      onUpdate: (value) => setCount(Math.round(value)),
      onComplete: () => setComplete(true)
    });
    return () => controls.stop();
  }, [reduced]);

  return (
    <motion.div
      className={`anniversary-counter${complete ? " is-complete" : ""}`}
      aria-label="28 aniversario"
      animate={complete && !reduced ? { scale: [1, 1.24, 1.05], filter: ["drop-shadow(0 0 0 rgba(242,213,130,0))", "drop-shadow(0 0 24px rgba(242,213,130,.9))", "drop-shadow(0 0 13px rgba(242,213,130,.58))"] } : { scale: 1 }}
      transition={{ duration: .58, ease: "easeOut" }}
    >
      <strong aria-hidden="true">{count}</strong>
      <span aria-hidden="true">ANIVERSARIO</span>
    </motion.div>
  );
}

function FallingRoyalLines() {
  return (
    <div className="falling-royal-lines" aria-hidden="true">
      <svg className="royal-trace royal-trace--one" viewBox="0 0 150 300">
        <path d="M75 0V118M24 170l15 55 36-42 36 42 15-55-27 20-24-49-24 49-27-20Zm15 55h72v17H39Z" />
      </svg>
      <svg className="royal-trace royal-trace--two" viewBox="0 0 150 300">
        <path d="M75 0v116m0 17 37 37-37 37-37-37 37-37Zm0 74v62m-31-31h62" />
      </svg>
      <svg className="royal-trace royal-trace--three" viewBox="0 0 150 300">
        <path d="M75 0v106m0 28c8 18 23 29 43 33-16 8-27 22-31 42-8-17-22-28-42-33 17-8 28-22 30-42Zm-47 98 10 10m84-10-10 10" />
      </svg>
      <svg className="royal-trace royal-trace--four" viewBox="0 0 150 300">
        <path d="M75 0v120M28 169c16 8 28 23 34 44 7-20 17-34 31-43 7 15 18 27 33 36M37 225c26 14 52 14 78 0M48 246h59" />
      </svg>
      <svg className="royal-trace royal-trace--five" viewBox="0 0 150 300">
        <path d="M75 0v112m-43 67 18 45 25-38 25 38 18-45-26 15-17-43-17 43-26-15Zm18 45h50" />
      </svg>
    </div>
  );
}

function RoyalScrollProgress() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 95, damping: 24, mass: .35 });
  const crownPosition = useTransform(smoothProgress, [0, 1], [0, 164]);

  if (reduced) return null;
  return (
    <div className="royal-scroll-progress" aria-hidden="true">
      <span className="royal-scroll-progress__label">RECORRIDO REAL</span>
      <div className="royal-scroll-progress__track">
        <motion.i style={{ scaleY: smoothProgress }} />
        <motion.b style={{ y: crownPosition }}>♛</motion.b>
      </div>
    </div>
  );
}

function Countdown({ target, now }: { target: string; now: Date }) {
  const remaining = Math.max(new Date(target).getTime() - now.getTime(), 0);
  const units = [
    ["Días", Math.floor(remaining / 86_400_000)],
    ["Horas", Math.floor((remaining / 3_600_000) % 24)],
    ["Min", Math.floor((remaining / 60_000) % 60)],
    ["Seg", Math.floor((remaining / 1000) % 60)]
  ] as const;
  return <div className="countdown" aria-label="Tiempo restante para el inicio">{units.map(([label, value]) => <span key={label}><strong>{String(value).padStart(2, "0")}</strong><small>{label}</small></span>)}</div>;
}

function CandidateCard({ candidate, index, canVote, onProfile, onVote }: { candidate: Candidate; index: number; canVote: boolean; onProfile: (candidate: Candidate, trigger: HTMLButtonElement) => void; onVote: (candidate: Candidate) => void }) {
  const reduced = useReducedMotion();
  const representation = normalizeModuleReferences(candidate.representa_a);
  const description = normalizeModuleReferences(candidate.descripcion);
  return (
    <motion.article className="candidate-card" initial={reduced ? false : { opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-10%" }} transition={{ delay: index * .08 }}>
      <Portrait candidate={candidate} index={index} />
      <div className="candidate-card__content">
        <p className="gold-kicker">{representation}</p>
        <h3>{candidate.nombre_completo}</h3>
        <em>{candidate.apodo_o_titulo}</em>
        <p>{description}</p>
        <div className="candidate-card__actions"><button className="text-button" onClick={(event) => onProfile(candidate, event.currentTarget)}>Ver su historia <span>→</span></button>{canVote && <button className="vote-action" aria-label={`Votar por ${candidate.nombre_completo}`} onClick={() => onVote(candidate)}><span>♛</span> Votar por ella</button>}</div>
      </div>
      <span className="candidate-number">0{index + 1}</span>
    </motion.article>
  );
}

function Portrait({ candidate, index, previewVideo = true, profile = false }: { candidate: Candidate; index: number; previewVideo?: boolean; profile?: boolean }) {
  const portraitClass = `candidate-card__portrait${profile ? " candidate-card__portrait--profile" : ""}`;
  if (candidate.video_url && previewVideo) return <VideoPreview candidate={candidate} />;
  if (candidate.foto_principal_url) return <div className={portraitClass}><Image src={candidate.foto_principal_url} alt={candidate.nombre_completo} fill sizes="(max-width: 720px) 100vw, 440px" style={{ objectFit: "cover" }} /></div>;
  return <div className={`${portraitClass} generated-portrait generated-portrait--${(index % 3) + 1}`} role="img" aria-label={`Retrato decorativo de ${candidate.nombre_completo}`}><div className="portrait-silhouette" /><span>{candidate.nombre_completo.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span></div>;
}

function VideoPreview({ candidate }: { candidate: Candidate }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void video.play().catch(() => undefined);
      else video.pause();
    }, { threshold: .55 });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);
  return <div className="candidate-card__portrait"><video ref={videoRef} src={candidate.video_url ?? undefined} poster={candidate.video_poster_url ?? candidate.foto_principal_url ?? undefined} muted loop playsInline preload="metadata" aria-label={`Video de presentación de ${candidate.nombre_completo}`} /></div>;
}

function useDialogFocus(containerRef: React.RefObject<HTMLElement | null>, onClose: () => void, closeDisabled = false, returnFocusTarget: HTMLElement | null = null) {
  const closeDisabledRef = useRef(closeDisabled);

  useEffect(() => {
    closeDisabledRef.current = closeDisabled;
  }, [closeDisabled]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      const preferred = containerRef.current?.querySelector<HTMLElement>("[autofocus]");
      const firstControl = containerRef.current?.querySelector<HTMLElement>("button:not([disabled]), input:not([disabled]), a[href], video[controls]");
      (preferred ?? firstControl ?? containerRef.current)?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !closeDisabledRef.current) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !containerRef.current) return;

      const controls = [...containerRef.current.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), input:not([disabled]), video[controls], [tabindex]:not([tabindex='-1'])"
      )].filter((element) => !element.hasAttribute("hidden"));
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) {
        event.preventDefault();
        containerRef.current.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      const target = returnFocusTarget ?? previouslyFocused;
      window.setTimeout(() => {
        if (target?.isConnected) target.focus();
      }, 0);
    };
  }, [containerRef, onClose, returnFocusTarget]);
}

function ProfileModal({ candidate, canVote, returnFocusTarget, onClose, onVote }: { candidate: Candidate; canVote: boolean; returnFocusTarget: HTMLElement | null; onClose: () => void; onVote: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const representation = normalizeModuleReferences(candidate.representa_a);
  const description = normalizeModuleReferences(candidate.descripcion);
  useDialogFocus(dialogRef, onClose, false, returnFocusTarget);

  return (
    <motion.div className="public-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.article ref={dialogRef} className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title" tabIndex={-1} initial={{ scale: .96, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96 }} onAnimationComplete={() => closeButtonRef.current?.focus()} onMouseDown={(event) => event.stopPropagation()}>
        <button ref={closeButtonRef} className="close-button" onClick={onClose} aria-label="Cerrar" autoFocus>×</button>
        <div className="profile-modal__media">
          <Portrait candidate={candidate} index={0} previewVideo={false} profile />
          {candidate.video_url && <video className="profile-video" src={candidate.video_url} poster={candidate.video_poster_url ?? candidate.foto_principal_url ?? undefined} controls playsInline preload="metadata" aria-label={`Video completo de ${candidate.nombre_completo}`} />}
          {candidate.galeria_urls.length > 0 && <div className="profile-gallery">{candidate.galeria_urls.map((url, index) => <Image key={url} src={url} alt={`${candidate.nombre_completo}, fotografía ${index + 1}`} width={220} height={150} sizes="(max-width: 720px) 42vw, 180px" />)}</div>}
        </div>
        <div className="profile-modal__content"><p className="gold-kicker">{representation}</p><h2 id="profile-dialog-title">{candidate.nombre_completo}</h2><em>{candidate.apodo_o_titulo}</em><blockquote>“{description}”</blockquote><div className="profile-tags"><span>Propósito</span><span>Comunidad</span><span>Talento</span></div>{canVote && <button className="royal-button" onClick={onVote}>Votar por ella ♛</button>}</div>
      </motion.article>
    </motion.div>
  );
}

function VoteModal({ candidate, configured, requiresCode, onClose, onSuccess }: { candidate: Candidate; configured: boolean; requiresCode: boolean; onClose: () => void; onSuccess: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VoteResponse | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const dialogRef = useRef<HTMLFormElement>(null);
  useDialogFocus(dialogRef, onClose, busy);

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
    const { data, error } = await client.functions.invoke("emitir-voto", { body: { candidataId: candidate.id, codigo: code, turnstileToken } });
    let errorMessage = error?.message ?? "No pudimos registrar el voto.";
    const errorContext = error && typeof error === "object" ? (error as { context?: { clone?: () => Response } }).context : undefined;
    if (errorContext?.clone) {
      try {
        const errorBody = await errorContext.clone().json() as Partial<VoteResponse>;
        if (typeof errorBody.message === "string") errorMessage = errorBody.message;
      } catch { /* La respuesta puede no contener JSON. */ }
    }
    const response = (data ?? { ok: false, code: "ERROR", message: errorMessage }) as VoteResponse;
    setResult(response);
    setBusy(false);
    if (!response.ok) {
      setTurnstileToken("");
      (window as Window & { turnstile?: { reset: () => void } }).turnstile?.reset();
    }
    if (response.ok) {
      localStorage.setItem("reinado:voted", "true");
      confetti({ particleCount: 130, spread: 75, colors: ["#d6aa4b", "#fff3c4", "#751f3f"], origin: { y: .7 } });
      setTimeout(onSuccess, 1500);
    }
  }, [candidate.id, code, configured, onSuccess, turnstileToken]);

  return (
    <motion.div className="public-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => { if (!busy) onClose(); }}>
      <motion.form ref={dialogRef} className="vote-modal" role="dialog" aria-modal="true" aria-labelledby="vote-dialog-title" tabIndex={-1} initial={{ scale: .95, y: 22 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .95 }} onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="close-button" onClick={onClose} aria-label="Cerrar">×</button>
        <span className="vote-crown">♛</span>
        <p className="gold-kicker">CONFIRMA TU ELECCIÓN</p>
        <h2 id="vote-dialog-title">Tu voto es definitivo</h2>
        <div className="chosen-candidate"><div>{candidate.nombre_completo.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><span><small>HAS ELEGIDO A</small><strong>{candidate.nombre_completo}</strong></span></div>
        {requiresCode ? <><label>Código único de votación<input autoFocus autoComplete="one-time-code" placeholder="REY-XXXX-XXXX-XXXX" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} required minLength={10} /></label>
        <p className="code-help">Lo encontrarás en la invitación que recibiste. Solo puede usarse una vez.</p></> : <p className="google-confirmation">✓ Tu cuenta de Google será la identidad única asociada al voto.</p>}
        {turnstileSiteKey ? <TurnstileWidget siteKey={turnstileSiteKey} onToken={setTurnstileToken} /> : <div className="turnstile-placeholder">Turnstile debe configurarse antes de habilitar producción</div>}
        {result && <p className={result.ok ? "vote-result vote-result--ok" : "vote-result"}>{result.message}</p>}
        <button className="royal-button royal-button--wide" disabled={busy || (configured && (!turnstileSiteKey || !turnstileToken))}>{busy ? "Verificando…" : !turnstileToken && configured ? "Completa la verificación" : "Confirmar mi voto"} <span>♛</span></button>
        <p className="secure-caption">◉ Operación cifrada · Tu código nunca se muestra públicamente</p>
      </motion.form>
    </motion.div>
  );
}

function TurnstileWidget({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const callbackName = useMemo(() => `reinadoTurnstile_${crypto.randomUUID().replaceAll("-", "")}`, []);
  useEffect(() => {
    const callbacks = window as unknown as Window & Record<string, unknown>;
    callbacks[callbackName] = onToken;
    if (!document.querySelector('script[src*="turnstile"]')) {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    return () => { delete callbacks[callbackName]; };
  }, [callbackName, onToken]);
  return <div className="cf-turnstile" data-sitekey={siteKey} data-theme="light" data-size="flexible" data-callback={callbackName} />;
}
