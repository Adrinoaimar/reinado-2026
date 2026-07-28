"use client";

import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { Button, EmptyState, SectionHeading } from "@reinado/ui";
import { codeBatchSchema } from "@reinado/validation";
import { getSupabaseBrowserClient } from "@reinado/supabase-client";

type CodeRecord = {
  id: string;
  etiqueta: string | null;
  lote: string;
  activo: boolean;
  usado: boolean;
  usado_en: string | null;
  vence_en: string | null;
  creado_en: string;
};

function formatCode(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const body = Array.from(bytes).map((byte) => alphabet[byte & 31]).join("").slice(0, 26);
  return `REY-${body.slice(0, 5)}-${body.slice(5, 10)}-${body.slice(10, 15)}-${body.slice(15, 20)}-${body.slice(20)}`;
}

function codeStatus(record: CodeRecord): "disponible" | "usado" | "vencido" | "anulado" {
  if (record.usado) return "usado";
  if (!record.activo) return "anulado";
  if (record.vence_en && new Date(record.vence_en) < new Date()) return "vencido";
  return "disponible";
}

export function CodeGenerator({ configured, onNotice }: { configured: boolean; onNotice: (message: string) => void }) {
  const [amount, setAmount] = useState(10);
  const [batch, setBatch] = useState("PRUEBA-2026");
  const [label, setLabel] = useState("Lote de prueba");
  const [generated, setGenerated] = useState<string[]>([]);
  const [records, setRecords] = useState<CodeRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loadingRecords, setLoadingRecords] = useState(configured);

  async function loadRecords() {
    if (!configured) {
      setLoadingRecords(false);
      return;
    }
    const { data, error } = await getSupabaseBrowserClient()
      .from("codigos_votacion")
      .select("id, etiqueta, lote, activo, usado, usado_en, vence_en, creado_en")
      .order("creado_en", { ascending: false })
      .limit(500);
    if (error) onNotice("No se pudo cargar el inventario de códigos.");
    else setRecords((data ?? []) as CodeRecord[]);
    setLoadingRecords(false);
  }

  useEffect(() => {
    if (!configured) return;
    const client = getSupabaseBrowserClient();
    void client.from("codigos_votacion")
      .select("id, etiqueta, lote, activo, usado, usado_en, vence_en, creado_en")
      .order("creado_en", { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (error) onNotice("No se pudo cargar el inventario de códigos.");
        else setRecords((data ?? []) as CodeRecord[]);
        setLoadingRecords(false);
      });
  }, [configured, onNotice]);

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return records.filter((record) => !term ||
      record.lote.toLocaleLowerCase().includes(term) ||
      record.etiqueta?.toLocaleLowerCase().includes(term));
  }, [records, search]);

  const stats = useMemo(() => {
    const values = { total: records.length, disponible: 0, usado: 0, vencido: 0, anulado: 0 };
    for (const record of records) values[codeStatus(record)] += 1;
    return values;
  }, [records]);

  async function generateBatch(cantidad: number, lote: string, etiqueta: string) {
    const parsed = codeBatchSchema.safeParse({ cantidad, lote, etiqueta });
    if (!parsed.success) {
      onNotice("La cantidad debe estar entre 1 y 1000 y el lote necesita un nombre.");
      return;
    }
    const codes = Array.from({ length: cantidad }, () => {
      const bytes = crypto.getRandomValues(new Uint8Array(26));
      return formatCode(bytes);
    });
    if (configured) {
      const { data, error } = await getSupabaseBrowserClient().functions.invoke("generar-codigos", {
        body: { cantidad, lote, etiqueta }
      });
      if (!error && Array.isArray(data?.codes)) {
        setGenerated(data.codes as string[]);
        await loadRecords();
      }
      else {
        onNotice("La función segura de generación no está disponible para esta sesión.");
        return;
      }
    } else {
      setGenerated(codes);
      onNotice("Códigos de demostración generados localmente; no son válidos para votar.");
    }
  }

  async function invalidate(record: CodeRecord) {
    if (!configured || record.usado) return;
    const { error } = await getSupabaseBrowserClient()
      .from("codigos_votacion")
      .update({ activo: false })
      .eq("id", record.id)
      .eq("usado", false);
    if (error) onNotice("No se pudo anular el código.");
    else {
      setRecords((current) => current.map((item) => item.id === record.id ? { ...item, activo: false } : item));
      onNotice("Código anulado. Su valor completo permanece oculto.");
    }
  }

  async function regenerateBatch(source: CodeRecord) {
    const batchRecords = records.filter((record) => record.lote === source.lote);
    const amountToGenerate = Math.min(Math.max(batchRecords.length, 1), 1000);
    if (configured) {
      const { error } = await getSupabaseBrowserClient()
        .from("codigos_votacion")
        .update({ activo: false })
        .eq("lote", source.lote)
        .eq("usado", false);
      if (error) {
        onNotice("No se pudo cerrar el lote anterior.");
        return;
      }
    }
    const replacement = `${source.lote}-R${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`;
    setBatch(replacement);
    setLabel(source.etiqueta ?? "");
    setAmount(amountToGenerate);
    await generateBatch(amountToGenerate, replacement, source.etiqueta ?? "");
    onNotice(`Lote regenerado como ${replacement}; los códigos anteriores no usados quedaron anulados.`);
  }

  function downloadCsv() {
    const csv = ["codigo,etiqueta,lote", ...generated.map((code) => `${code},"${label.replaceAll('"', '""')}","${batch.replaceAll('"', '""')}"`)].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `codigos-${batch.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function downloadPdf() {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    pdf.setProperties({ title: `Códigos ${batch}`, subject: "Códigos únicos de votación" });
    for (let index = 0; index < generated.length; index += 1) {
      if (index > 0 && index % 8 === 0) pdf.addPage();
      const cell = index % 8;
      const column = cell % 2;
      const row = Math.floor(cell / 2);
      const x = 14 + column * 94;
      const y = 15 + row * 68;
      const qr = await QRCode.toDataURL(generated[index]!, { errorCorrectionLevel: "M", margin: 1, width: 250 });
      pdf.setDrawColor(214, 190, 130);
      pdf.roundedRect(x, y, 88, 60, 2, 2);
      pdf.addImage(qr, "PNG", x + 4, y + 7, 38, 38);
      pdf.setFont("times", "bold");
      pdf.setFontSize(11);
      pdf.text("REINADO 2026", x + 45, y + 14);
      pdf.setFont("courier", "bold");
      pdf.setFontSize(9);
      pdf.text(generated[index]!, x + 45, y + 25);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.text(label || "Código único", x + 45, y + 33);
      pdf.text(`Lote: ${batch}`, x + 45, y + 39);
      pdf.setFontSize(6);
      pdf.text("Un solo uso · No compartir", x + 45, y + 48);
    }
    pdf.save(`codigos-${batch.toLowerCase()}.pdf`);
  }

  return (
    <section>
      <SectionHeading eyebrow="ACCESO ÚNICO" title="Códigos de votación" />
      <div className="code-layout">
        <div className="panel form-stack">
          <h3>Generar lote</h3>
          <label>Cantidad<input type="number" min={1} max={1000} value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></label>
          <label>Nombre del lote<input value={batch} onChange={(event) => setBatch(event.target.value.toUpperCase())} /></label>
          <label>Etiqueta<input value={label} onChange={(event) => setLabel(event.target.value)} /></label>
          <p className="field-note">Cada código contiene 130 bits aleatorios. En producción solo se almacena su hash SHA-256 con pepper.</p>
          <Button onClick={() => void generateBatch(amount, batch, label)}>Generar códigos</Button>
        </div>
        <div className="panel">
          {generated.length === 0 ? <EmptyState icon="◇" title="Ningún código visible" body="Los códigos solo se muestran durante su exportación inicial." /> : (
            <>
              <div className="code-result-header"><div><p className="eyebrow">GENERADOS AHORA</p><h3>{generated.length} códigos</h3></div><div className="code-export-actions"><Button className="button--ghost" onClick={() => void downloadPdf()}>PDF con QR</Button><Button onClick={downloadCsv}>CSV</Button></div></div>
              <div className="code-list">{generated.slice(0, 8).map((code) => <code key={code}>{code}</code>)}</div>
              {generated.length > 8 && <p className="field-note">+ {generated.length - 8} adicionales en la exportación.</p>}
              <p className="danger-note">Guarda la exportación ahora. Al cerrar esta pantalla no se volverá a mostrar el texto completo.</p>
            </>
          )}
        </div>
      </div>
      <div className="code-inventory">
        <div className="stats-grid code-stats">
          <article><strong>{stats.total}</strong><span>Total</span></article>
          <article><strong>{stats.disponible}</strong><span>Disponibles</span></article>
          <article><strong>{stats.usado}</strong><span>Usados</span></article>
          <article><strong>{stats.vencido}</strong><span>Vencidos</span></article>
          <article><strong>{stats.anulado}</strong><span>Anulados</span></article>
        </div>
        <div className="panel">
          <div className="inventory-toolbar">
            <div><p className="eyebrow">INVENTARIO SEGURO</p><h3>Estados y lotes</h3></div>
            <input aria-label="Buscar por lote o etiqueta" placeholder="Buscar lote o etiqueta…" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          {loadingRecords ? <p className="field-note">Cargando inventario…</p> : filteredRecords.length === 0 ? (
            <EmptyState icon="⌕" title="Sin coincidencias" body="Genera un lote o cambia la búsqueda. Los códigos completos nunca aparecen en este inventario." />
          ) : (
            <div className="code-table-wrap">
              <table className="code-table">
                <thead><tr><th>Lote</th><th>Etiqueta</th><th>Estado</th><th>Creado</th><th>Acciones</th></tr></thead>
                <tbody>{filteredRecords.map((record) => {
                  const status = codeStatus(record);
                  return <tr key={record.id}>
                    <td>{record.lote}</td>
                    <td>{record.etiqueta || "—"}</td>
                    <td><span className={`code-status code-status--${status}`}>{status}</span></td>
                    <td>{new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(new Date(record.creado_en))}</td>
                    <td><div className="table-actions">
                      {status === "disponible" && <button onClick={() => void invalidate(record)}>Anular</button>}
                      <button onClick={() => void regenerateBatch(record)}>Regenerar lote</button>
                    </div></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          )}
          {records.length >= 500 && <p className="field-note">Se muestran los 500 registros más recientes.</p>}
        </div>
      </div>
    </section>
  );
}
