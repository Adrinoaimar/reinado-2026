"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { Button, EmptyState, SectionHeading } from "@reinado/ui";
import { codeBatchSchema } from "@reinado/validation";
import { getSupabaseBrowserClient } from "@reinado/supabase-client";

function formatCode(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const body = Array.from(bytes).map((byte) => alphabet[byte % alphabet.length]).join("").slice(0, 12);
  return `REY-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;
}

export function CodeGenerator({ configured, onNotice }: { configured: boolean; onNotice: (message: string) => void }) {
  const [amount, setAmount] = useState(10);
  const [batch, setBatch] = useState("PRUEBA-2026");
  const [label, setLabel] = useState("Lote de prueba");
  const [generated, setGenerated] = useState<string[]>([]);

  async function generate() {
    const parsed = codeBatchSchema.safeParse({ cantidad: amount, lote: batch, etiqueta: label });
    if (!parsed.success) {
      onNotice("La cantidad debe estar entre 1 y 1000 y el lote necesita un nombre.");
      return;
    }
    const codes = Array.from({ length: amount }, () => {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      return formatCode(bytes);
    });
    if (configured) {
      const { data, error } = await getSupabaseBrowserClient().functions.invoke("generar-codigos", {
        body: { cantidad: amount, lote: batch, etiqueta: label }
      });
      if (!error && Array.isArray(data?.codes)) setGenerated(data.codes as string[]);
      else {
        onNotice("La función segura de generación no está disponible para esta sesión.");
        return;
      }
    } else {
      setGenerated(codes);
      onNotice("Códigos de demostración generados localmente; no son válidos para votar.");
    }
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
          <p className="field-note">Cada código usa 128 bits aleatorios. En producción solo se almacena su hash SHA-256 con pepper.</p>
          <Button onClick={generate}>Generar códigos</Button>
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
    </section>
  );
}
