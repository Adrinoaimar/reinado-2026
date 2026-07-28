"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, CrownMark, EmptyState, SectionHeading } from "@reinado/ui";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@reinado/supabase-client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Candidate, VotingConfig } from "@reinado/types";
import { candidateSchema } from "@reinado/validation";
import { CodeGenerator } from "./code-generator";

type View = "resumen" | "candidatas" | "codigos" | "configuracion" | "resultados" | "seguridad";

const emptyCandidate = {
  nombre_completo: "",
  apodo_o_titulo: "",
  edad: 18,
  descripcion: "",
  representa_a: "",
  orden: 0,
  activa: true
};

const demoCandidates: Candidate[] = [
  {
    id: "demo-1",
    nombre_completo: "Valentina Reyes",
    apodo_o_titulo: "La voz de la costa",
    edad: 21,
    descripcion: "Promueve proyectos culturales que conectan tradición, creatividad y nuevas generaciones.",
    foto_principal_url: null,
    galeria_urls: [],
    video_url: null,
    video_poster_url: null,
    representa_a: "Sede Central",
    orden: 1,
    activa: true
  },
  {
    id: "demo-2",
    nombre_completo: "Camila del Mar",
    apodo_o_titulo: "Elegancia que inspira",
    edad: 20,
    descripcion: "Defensora del acceso a la educación artística y el liderazgo femenino.",
    foto_principal_url: null,
    galeria_urls: [],
    video_url: null,
    video_poster_url: null,
    representa_a: "Sede Norte",
    orden: 2,
    activa: true
  }
];

const defaultConfig: VotingConfig = {
  id: 1,
  nombre_evento: "Reinado 2026",
  fecha_inicio: null,
  fecha_fin: null,
  mensaje_antes: "La votación abrirá muy pronto.",
  mensaje_despues: "Gracias por ser parte de esta celebración.",
  modo_acceso: "codigo",
  google_login_activo: false,
  dominio_correo_permitido: null,
  mostrar_contador: false,
  mostrar_resultados: false,
  color_primario: "#d6aa4b",
  color_acento: "#751f3f"
};

const nav: Array<{ id: View; label: string; icon: string }> = [
  { id: "resumen", label: "Vista general", icon: "⌂" },
  { id: "candidatas", label: "Candidatas", icon: "♛" },
  { id: "codigos", label: "Códigos", icon: "◇" },
  { id: "configuracion", label: "Configuración", icon: "⚙" },
  { id: "resultados", label: "Resultados", icon: "▥" },
  { id: "seguridad", label: "Seguridad", icon: "◉" }
];

async function uploadCandidateFile(client: SupabaseClient, bucket: string, candidateId: string, label: string, file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || (bucket.endsWith("videos") ? "mp4" : "webp");
  const path = `${candidateId}/${label}.${extension}`;
  const { error } = await client.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
  if (error) throw new Error(error.message);
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export function AdminDashboard() {
  const [view, setView] = useState<View>("resumen");
  const [candidates, setCandidates] = useState<Candidate[]>(demoCandidates);
  const [config, setConfig] = useState<VotingConfig>(defaultConfig);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState(emptyCandidate);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [mainPhoto, setMainPhoto] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [notice, setNotice] = useState("");
  const configured = isSupabaseConfigured();
  const [authReady, setAuthReady] = useState(!configured);
  const [isAdmin, setIsAdmin] = useState(!configured);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    if (!configured || !isAdmin) return;
    const client = getSupabaseBrowserClient();
    void Promise.all([
      client.from("candidatas").select("*").order("orden"),
      client.from("configuracion_votacion").select("*").eq("id", 1).single()
    ]).then(([candidateResult, configResult]) => {
      if (candidateResult.data) setCandidates(candidateResult.data as Candidate[]);
      if (configResult.data) setConfig(configResult.data as VotingConfig);
    });
  }, [configured, isAdmin]);

  useEffect(() => {
    if (!configured) return;
    const client = getSupabaseBrowserClient();
    void client.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setIsAdmin(false);
        setAuthReady(true);
        return;
      }
      const { data: admin } = await client.from("administradores")
        .select("id, debe_cambiar_password")
        .eq("id", data.user.id)
        .eq("activo", true)
        .maybeSingle();
      setIsAdmin(Boolean(admin));
      setMustChangePassword(Boolean(admin?.debe_cambiar_password));
      setAuthReady(true);
    });
  }, [configured]);

  const stats = useMemo(() => ({
    candidates: candidates.filter((candidate) => candidate.activa).length,
    availableCodes: 0,
    votes: 0,
    participation: 0
  }), [candidates]);

  async function saveCandidate(event: React.FormEvent) {
    event.preventDefault();
    const parsed = candidateSchema.safeParse({
      ...form,
      apodo_o_titulo: form.apodo_o_titulo || null
    });
    if (!parsed.success) {
      setNotice("Revisa los campos: nombre, descripción y representación son obligatorios.");
      return;
    }
    const candidateId = editingCandidate?.id ?? crypto.randomUUID();
    if (!configured) {
      const value: Candidate = {
        id: candidateId,
        ...parsed.data,
        apodo_o_titulo: parsed.data.apodo_o_titulo ?? null,
        edad: parsed.data.edad ?? null,
        foto_principal_url: mainPhoto ? URL.createObjectURL(mainPhoto) : editingCandidate?.foto_principal_url ?? null,
        galeria_urls: galleryFiles.length
          ? galleryFiles.map((file) => URL.createObjectURL(file))
          : editingCandidate?.galeria_urls ?? [],
        video_url: videoFile ? URL.createObjectURL(videoFile) : editingCandidate?.video_url ?? null,
        video_poster_url: editingCandidate?.video_poster_url ?? null
      };
      setCandidates((current) => editingCandidate ? current.map((candidate) => candidate.id === candidateId ? value : candidate) : [...current, value]);
      setNotice(`Candidata ${editingCandidate ? "actualizada" : "agregada"} en demostración. Conecta Supabase para persistir.`);
    } else {
      try {
        const client = getSupabaseBrowserClient();
        let photoUrl = editingCandidate?.foto_principal_url ?? null;
        let galleryUrls = editingCandidate?.galeria_urls ?? [];
        let videoUrl = editingCandidate?.video_url ?? null;
        if (mainPhoto) photoUrl = await uploadCandidateFile(client, "candidatas-fotos", candidateId, "principal", mainPhoto);
        if (galleryFiles.length) galleryUrls = await Promise.all(galleryFiles.slice(0, 12).map((file, index) => uploadCandidateFile(client, "candidatas-fotos", candidateId, `galeria-${index + 1}`, file)));
        if (videoFile) videoUrl = await uploadCandidateFile(client, "candidatas-videos", candidateId, "presentacion", videoFile);
        const payload = { id: candidateId, ...parsed.data, foto_principal_url: photoUrl, galeria_urls: galleryUrls, video_url: videoUrl };
        const query = editingCandidate
          ? client.from("candidatas").update(payload).eq("id", candidateId)
          : client.from("candidatas").insert(payload);
        const { data, error } = await query.select().single();
        if (error) throw error;
        setCandidates((current) => editingCandidate ? current.map((candidate) => candidate.id === candidateId ? data as Candidate : candidate) : [...current, data as Candidate]);
        setNotice(`Candidata ${editingCandidate ? "actualizada" : "guardada"}.`);
      } catch (error) {
        setNotice(`No se pudo guardar: ${error instanceof Error ? error.message : "error desconocido"}`);
        return;
      }
    }
    closeEditor();
  }

  function openEditor(candidate?: Candidate) {
    setEditingCandidate(candidate ?? null);
    setForm(candidate ? {
      nombre_completo: candidate.nombre_completo,
      apodo_o_titulo: candidate.apodo_o_titulo ?? "",
      edad: candidate.edad ?? 18,
      descripcion: candidate.descripcion,
      representa_a: candidate.representa_a,
      orden: candidate.orden,
      activa: candidate.activa
    } : emptyCandidate);
    setMainPhoto(null);
    setGalleryFiles([]);
    setVideoFile(null);
    setEditorOpen(true);
  }

  function closeEditor() {
    setForm(emptyCandidate);
    setEditingCandidate(null);
    setMainPhoto(null);
    setGalleryFiles([]);
    setVideoFile(null);
    setEditorOpen(false);
  }

  async function toggleCandidate(candidate: Candidate) {
    const next = !candidate.activa;
    if (configured) {
      const { error } = await getSupabaseBrowserClient().from("candidatas").update({ activa: next }).eq("id", candidate.id);
      if (error) return setNotice("No se pudo cambiar el estado.");
    }
    setCandidates((current) => current.map((item) => item.id === candidate.id ? { ...item, activa: next } : item));
  }

  async function deleteCandidate(candidate: Candidate) {
    if (!window.confirm(`¿Eliminar a ${candidate.nombre_completo}? Esta acción solo funciona si todavía no tiene votos.`)) return;
    if (configured) {
      const { error } = await getSupabaseBrowserClient().from("candidatas").delete().eq("id", candidate.id);
      if (error) return setNotice("No se puede eliminar: puede tener votos asociados.");
    }
    setCandidates((current) => current.filter((item) => item.id !== candidate.id));
    setNotice("Candidata eliminada.");
  }

  async function moveCandidate(candidate: Candidate, direction: -1 | 1) {
    const ordered = [...candidates].sort((a, b) => a.orden - b.orden);
    const index = ordered.findIndex((item) => item.id === candidate.id);
    const other = ordered[index + direction];
    if (!other) return;
    const updates = [
      { ...candidate, orden: other.orden },
      { ...other, orden: candidate.orden }
    ];
    if (configured) {
      const client = getSupabaseBrowserClient();
      const results = await Promise.all(updates.map((item) => client.from("candidatas").update({ orden: item.orden }).eq("id", item.id)));
      if (results.some((result) => result.error)) return setNotice("No se pudo cambiar el orden.");
    }
    setCandidates((current) => current.map((item) => updates.find((update) => update.id === item.id) ?? item).sort((a, b) => a.orden - b.orden));
  }

  async function saveConfig() {
    if (config.fecha_inicio && config.fecha_fin && new Date(config.fecha_inicio) >= new Date(config.fecha_fin)) {
      setNotice("La fecha de cierre debe ser posterior a la fecha de inicio.");
      return;
    }
    if (configured) {
      const { error } = await getSupabaseBrowserClient().from("configuracion_votacion").update(config).eq("id", 1);
      if (error) {
        setNotice("No se pudo actualizar la configuración. Verifica tu sesión.");
        return;
      }
    }
    setNotice(configured ? "Configuración guardada." : "Vista previa actualizada; conecta Supabase para persistir.");
  }

  if (!authReady) return <div className="auth-screen"><div className="auth-loader">♛</div><p>Verificando acceso seguro…</p></div>;
  if (configured && !isAdmin) return <AdminLogin onAuthenticated={(changeRequired) => { setIsAdmin(true); setMustChangePassword(changeRequired); }} />;

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <CrownMark />
        <p className="sidebar__caption">PANEL DE CONTROL</p>
        <nav aria-label="Navegación principal">
          {nav.map((item) => (
            <button key={item.id} className={view === item.id ? "nav-link is-active" : "nav-link"} onClick={() => setView(item.id)}>
              <span aria-hidden="true">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar__footer">
          <span className="avatar">AR</span>
          <div><strong>Administrador</strong><small>Superadmin</small></div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">REINADO 2026</p>
            <h1>{nav.find((item) => item.id === view)?.label}</h1>
          </div>
          <div className="topbar__actions">
            {!configured && <Badge tone="wine">Modo demostración</Badge>}
            <Badge tone="green">Sistema protegido</Badge>
            <a className="button button--ghost" href={process.env.NEXT_PUBLIC_VOTACION_URL ?? "http://localhost:3001"} target="_blank">Ver sitio público ↗</a>
          </div>
        </header>

        {mustChangePassword && <div className="password-warning"><strong>Cambio de contraseña requerido</strong><span>Actualiza la contraseña temporal antes de operar el evento.</span></div>}
        {notice && <button className="notice" onClick={() => setNotice("")}>{notice}<span>×</span></button>}

        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            {view === "resumen" && <Overview stats={stats} config={config} candidates={candidates} onNavigate={setView} />}
            {view === "candidatas" && (
              <section>
                <SectionHeading eyebrow="EL ELENCO" title="Candidatas" aside={<Button onClick={() => openEditor()}>+ Nueva candidata</Button>} />
                <div className="candidate-grid">
                  {candidates.map((candidate, index) => (
                    <article className="candidate-admin-card" key={candidate.id}>
                      <div className={`portrait portrait--${(index % 3) + 1}`} role="img" aria-label={`Retrato de ${candidate.nombre_completo}`}>
                        <span>{candidate.nombre_completo.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
                        <Badge tone={candidate.activa ? "green" : "muted"}>{candidate.activa ? "Activa" : "Oculta"}</Badge>
                      </div>
                      <div className="candidate-admin-card__body">
                        <small>{candidate.representa_a}</small>
                        <h3>{candidate.nombre_completo}</h3>
                        <p>{candidate.apodo_o_titulo}</p>
                        <div className="card-actions">
                          <button onClick={() => openEditor(candidate)}>Editar</button>
                          <button onClick={() => void toggleCandidate(candidate)}>{candidate.activa ? "Ocultar" : "Activar"}</button>
                          <button onClick={() => void moveCandidate(candidate, -1)} aria-label="Mover arriba">↑</button>
                          <button onClick={() => void moveCandidate(candidate, 1)} aria-label="Mover abajo">↓</button>
                          <button className="danger-action" onClick={() => void deleteCandidate(candidate)}>Eliminar</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
            {view === "codigos" && <CodeGenerator configured={configured} onNotice={setNotice} />}
            {view === "configuracion" && <Configuration config={config} onChange={setConfig} onSave={saveConfig} />}
            {view === "resultados" && <Results candidates={candidates} configured={configured} />}
            {view === "seguridad" && <Security configured={configured} />}
          </motion.div>
        </AnimatePresence>
      </section>

      <AnimatePresence>
        {editorOpen && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={closeEditor}>
            <motion.form className="modal" initial={{ scale: .96, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96 }} onSubmit={saveCandidate} onMouseDown={(event) => event.stopPropagation()}>
              <div className="modal__header"><div><p className="eyebrow">{editingCandidate ? "EDITAR PERFIL" : "NUEVO PERFIL"}</p><h2>{editingCandidate ? "Actualizar candidata" : "Agregar candidata"}</h2></div><button type="button" onClick={closeEditor}>×</button></div>
              <label>Nombre completo<input value={form.nombre_completo} onChange={(event) => setForm({ ...form, nombre_completo: event.target.value })} required /></label>
              <div className="form-row"><label>Título o apodo<input value={form.apodo_o_titulo} onChange={(event) => setForm({ ...form, apodo_o_titulo: event.target.value })} /></label><label>Edad<input type="number" value={form.edad} onChange={(event) => setForm({ ...form, edad: Number(event.target.value) })} /></label></div>
              <label>Representa a<input value={form.representa_a} onChange={(event) => setForm({ ...form, representa_a: event.target.value })} required /></label>
              <label>Biografía<textarea rows={5} value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} required /></label>
              <div className="form-row"><label>Orden<input type="number" min={0} value={form.orden} onChange={(event) => setForm({ ...form, orden: Number(event.target.value) })} /></label><label className="checkbox-label"><input type="checkbox" checked={form.activa} onChange={(event) => setForm({ ...form, activa: event.target.checked })} /> Visible públicamente</label></div>
              <label className="upload-zone"><span>＋</span><strong>{mainPhoto?.name ?? "Foto principal"}</strong><small>JPG, PNG o WebP · máximo 6 MB</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setMainPhoto(event.target.files?.[0] ?? null)} hidden /></label>
              <label className="upload-zone"><span>▦</span><strong>{galleryFiles.length ? `${galleryFiles.length} fotos seleccionadas` : "Galería"}</strong><small>Hasta 12 imágenes</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setGalleryFiles(Array.from(event.target.files ?? []).slice(0, 12))} hidden /></label>
              <label className="upload-zone"><span>▶</span><strong>{videoFile?.name ?? "Video comprimido"}</strong><small>MP4 · máximo 12 MB · usa pnpm compress:media</small><input type="file" accept="video/mp4" onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)} hidden /></label>
              <div className="modal__actions"><Button type="button" className="button--ghost" onClick={closeEditor}>Cancelar</Button><Button type="submit">{editingCandidate ? "Actualizar" : "Guardar candidata"}</Button></div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
      {mustChangePassword && <PasswordChangeModal onComplete={() => setMustChangePassword(false)} />}
    </main>
  );
}

function PasswordChangeModal({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 16 || password !== confirmation) {
      setError("Usa al menos 16 caracteres y confirma la misma contraseña.");
      return;
    }
    setBusy(true);
    const client = getSupabaseBrowserClient();
    const { data: userResult, error: authError } = await client.auth.updateUser({ password });
    if (authError || !userResult.user) {
      setError(authError?.message ?? "No se pudo actualizar la contraseña.");
      setBusy(false);
      return;
    }
    const { error: profileError } = await client.from("administradores")
      .update({ debe_cambiar_password: false })
      .eq("id", userResult.user.id);
    if (profileError) {
      setError("La contraseña cambió, pero no se pudo confirmar el estado del perfil.");
      setBusy(false);
      return;
    }
    onComplete();
  }

  return (
    <div className="modal-backdrop password-gate">
      <form className="modal password-modal" onSubmit={updatePassword}>
        <span className="auth-loader">♛</span>
        <p className="eyebrow">PRIMER ACCESO</p>
        <h2>Crea tu contraseña privada</h2>
        <p>La contraseña temporal dejará de ser necesaria después de este cambio.</p>
        <label>Nueva contraseña<input type="password" autoComplete="new-password" minLength={16} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <label>Confirmar contraseña<input type="password" autoComplete="new-password" minLength={16} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>
        {error && <p className="auth-error">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? "Actualizando…" : "Guardar y continuar"}</Button>
      </form>
    </div>
  );
}

function AdminLogin({ onAuthenticated }: { onAuthenticated: (changeRequired: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const client = getSupabaseBrowserClient();
    const { data, error: authError } = await client.auth.signInWithPassword({ email, password });
    if (authError || !data.user) {
      setError("Correo o contraseña incorrectos.");
      setBusy(false);
      return;
    }
    const { data: admin } = await client.from("administradores")
      .select("activo, debe_cambiar_password")
      .eq("id", data.user.id)
      .maybeSingle();
    if (!admin?.activo) {
      await client.auth.signOut();
      setError("Esta cuenta no tiene acceso al panel.");
      setBusy(false);
      return;
    }
    onAuthenticated(Boolean(admin.debe_cambiar_password));
  }

  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={login}>
        <CrownMark />
        <p className="eyebrow">ACCESO PRIVADO</p>
        <h1>Panel de administración</h1>
        <p>Ingresa con la cuenta autorizada para gestionar el evento.</p>
        <label>Correo electrónico<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {error && <p className="auth-error">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? "Verificando…" : "Entrar al panel"}</Button>
        <small>Acceso protegido con Supabase Auth y RLS.</small>
      </form>
    </main>
  );
}

function Overview({ stats, config, candidates, onNavigate }: { stats: { candidates: number; availableCodes: number; votes: number; participation: number }; config: VotingConfig; candidates: Candidate[]; onNavigate: (view: View) => void }) {
  return (
    <>
      <div className="status-banner">
        <div className="status-banner__icon">◷</div>
        <div><p className="eyebrow">ESTADO ACTUAL</p><h2>La votación está cerrada</h2><p>Define una fecha de inicio y cierre para abrir el evento.</p></div>
        <Button onClick={() => onNavigate("configuracion")}>Configurar fechas</Button>
      </div>
      <div className="stats-grid">
        <Stat icon="♛" label="Candidatas activas" value={String(stats.candidates)} note={`${candidates.length} registradas`} />
        <Stat icon="◇" label="Códigos disponibles" value={String(stats.availableCodes)} note="Genera el primer lote" />
        <Stat icon="✓" label="Votos registrados" value={String(stats.votes)} note="Sin votos aún" />
        <Stat icon="↗" label="Participación" value={`${stats.participation}%`} note="Se calcula al abrir" />
      </div>
      <div className="overview-grid">
        <section className="panel">
          <SectionHeading eyebrow="ACCESOS RÁPIDOS" title="Pon todo a punto" />
          <div className="quick-actions">
            <button onClick={() => onNavigate("candidatas")}><span>＋</span><strong>Agregar candidata</strong><small>Crea un nuevo perfil</small></button>
            <button onClick={() => onNavigate("codigos")}><span>◇</span><strong>Generar códigos</strong><small>Prepara un lote seguro</small></button>
            <button onClick={() => onNavigate("configuracion")}><span>◷</span><strong>Abrir votación</strong><small>Configura fechas y mensajes</small></button>
          </div>
        </section>
        <section className="panel">
          <SectionHeading eyebrow="CONFIGURACIÓN" title={config.nombre_evento} />
          <dl className="config-summary">
            <div><dt>Modo de acceso</dt><dd><Badge>Código único</Badge></dd></div>
            <div><dt>Google</dt><dd>Apagado</dd></div>
            <div><dt>Resultados públicos</dt><dd>Ocultos</dd></div>
            <div><dt>Ventana</dt><dd>Sin configurar</dd></div>
          </dl>
        </section>
      </div>
    </>
  );
}

function Stat({ icon, label, value, note }: { icon: string; label: string; value: string; note: string }) {
  return <article className="stat-card"><div className="stat-card__icon">{icon}</div><div><p>{label}</p><strong>{value}</strong><small>{note}</small></div></article>;
}

function Configuration({ config, onChange, onSave }: { config: VotingConfig; onChange: (value: VotingConfig) => void; onSave: () => void }) {
  return (
    <section>
      <SectionHeading eyebrow="CONTROL DEL EVENTO" title="Configuración" aside={<Button onClick={onSave}>Guardar cambios</Button>} />
      <div className="settings-grid">
        <div className="panel form-stack">
          <h3>Información principal</h3>
          <label>Nombre del evento<input value={config.nombre_evento} onChange={(event) => onChange({ ...config, nombre_evento: event.target.value })} /></label>
          <div className="form-row"><label>Inicio<input type="datetime-local" value={config.fecha_inicio?.slice(0, 16) ?? ""} onChange={(event) => onChange({ ...config, fecha_inicio: event.target.value ? new Date(event.target.value).toISOString() : null })} /></label><label>Cierre<input type="datetime-local" value={config.fecha_fin?.slice(0, 16) ?? ""} onChange={(event) => onChange({ ...config, fecha_fin: event.target.value ? new Date(event.target.value).toISOString() : null })} /></label></div>
          <label>Mensaje previo<textarea value={config.mensaje_antes} onChange={(event) => onChange({ ...config, mensaje_antes: event.target.value })} /></label>
          <label>Mensaje final<textarea value={config.mensaje_despues} onChange={(event) => onChange({ ...config, mensaje_despues: event.target.value })} /></label>
        </div>
        <div className="panel form-stack">
          <h3>Acceso y privacidad</h3>
          <label>Modo de acceso<select value={config.modo_acceso} onChange={(event) => onChange({ ...config, modo_acceso: event.target.value as VotingConfig["modo_acceso"] })}><option value="codigo">Código único</option><option value="google_codigo">Google + código</option><option value="google">Solo Google (menos resistente)</option></select></label>
          <Toggle label="Inicio de sesión con Google" checked={config.google_login_activo} onChange={(checked) => onChange({ ...config, google_login_activo: checked })} />
          <Toggle label="Mostrar contador público" checked={config.mostrar_contador} onChange={(checked) => onChange({ ...config, mostrar_contador: checked })} />
          <Toggle label="Mostrar resultados públicos" checked={config.mostrar_resultados} onChange={(checked) => onChange({ ...config, mostrar_resultados: checked })} />
          <div className="form-row"><label>Color dorado<input type="color" value={config.color_primario} onChange={(event) => onChange({ ...config, color_primario: event.target.value })} /></label><label>Color acento<input type="color" value={config.color_acento} onChange={(event) => onChange({ ...config, color_acento: event.target.value })} /></label></div>
        </div>
      </div>
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="toggle-row"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i /></label>;
}

function Results({ candidates, configured }: { candidates: Candidate[]; configured: boolean }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [issuedCodes, setIssuedCodes] = useState(0);
  const totalVotes = Object.values(counts).reduce((sum, value) => sum + value, 0);

  useEffect(() => {
    if (!configured) return;
    const client = getSupabaseBrowserClient();
    void Promise.all([
      client.from("votos").select("candidata_id"),
      client.from("codigos_votacion").select("id", { count: "exact", head: true })
    ]).then(([votes, codes]) => {
      const next: Record<string, number> = {};
      for (const vote of votes.data ?? []) next[vote.candidata_id as string] = (next[vote.candidata_id as string] ?? 0) + 1;
      setCounts(next);
      setIssuedCodes(codes.count ?? 0);
    });
  }, [configured]);

  function exportResults() {
    const rows = candidates
      .map((candidate) => {
        const votes = counts[candidate.id] ?? 0;
        const percentage = totalVotes ? ((votes / totalVotes) * 100).toFixed(2) : "0.00";
        return `"${candidate.nombre_completo.replaceAll('"', '""')}","${candidate.representa_a.replaceAll('"', '""')}",${votes},${percentage}`;
      });
    const csv = ["candidata,representa_a,votos,porcentaje", ...rows].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = "resultados-reinado-2026.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <section>
      <SectionHeading eyebrow="CONTEO PRIVADO" title="Resultados" aside={<Button className="button--ghost" onClick={exportResults}>Exportar CSV</Button>} />
      <div className="stats-grid results-stats">
        <Stat icon="✓" label="Votos registrados" value={String(totalVotes)} note="Conteo en tiempo real" />
        <Stat icon="◇" label="Códigos emitidos" value={String(issuedCodes)} note={`${Math.max(issuedCodes - totalVotes, 0)} disponibles o anulados`} />
        <Stat icon="↗" label="Participación" value={`${issuedCodes ? Math.round((totalVotes / issuedCodes) * 100) : 0}%`} note="Votos / códigos emitidos" />
      </div>
      <div className="panel">
        {totalVotes === 0 && <EmptyState icon="▥" title="Aún no hay votos" body="Los resultados aparecerán aquí cuando abras la votación y se registre el primer voto." />}
        <div className="result-preview">{candidates.map((candidate) => {
          const votes = counts[candidate.id] ?? 0;
          const percentage = totalVotes ? (votes / totalVotes) * 100 : 0;
          return <div key={candidate.id}><span>{candidate.nombre_completo}</span><div><i style={{ width: `${percentage}%` }} /></div><strong>{votes}</strong></div>;
        })}</div>
      </div>
    </section>
  );
}

function Security({ configured }: { configured: boolean }) {
  return (
    <section>
      <SectionHeading eyebrow="AUDITORÍA" title="Seguridad del sistema" />
      <div className="security-grid">
        {[
          ["✓", "RLS de mínimo privilegio", "Las tablas públicas no permiten escrituras directas."],
          ["◇", "Códigos con hash", "Los códigos visibles nunca se guardan en texto plano."],
          ["◉", "Voto transaccional", "Código y sesión solo pueden emitir un voto."],
          ["♜", "Turnstile en servidor", "Los tokens se verifican antes de tocar la base de datos."],
          ["#", "IP anonimizada", "Solo se conserva un hash salado para rate limiting."],
          [configured ? "✓" : "!", configured ? "Supabase conectado" : "Infraestructura pendiente", configured ? "Las variables públicas están disponibles." : "Configura el proyecto Free antes de producción."]
        ].map(([icon, title, body]) => <article className="security-card" key={title}><span>{icon}</span><h3>{title}</h3><p>{body}</p></article>)}
      </div>
    </section>
  );
}
