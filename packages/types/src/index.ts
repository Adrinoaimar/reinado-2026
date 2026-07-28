export type AccessMode = "codigo" | "google_codigo" | "google";

export interface Candidate {
  id: string;
  nombre_completo: string;
  apodo_o_titulo: string | null;
  edad: number | null;
  descripcion: string;
  foto_principal_url: string | null;
  galeria_urls: string[];
  video_url: string | null;
  video_poster_url: string | null;
  representa_a: string;
  orden: number;
  activa: boolean;
}

export interface VotingConfig {
  id: 1;
  nombre_evento: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  mensaje_antes: string;
  mensaje_despues: string;
  modo_acceso: AccessMode;
  google_login_activo: boolean;
  dominio_correo_permitido: string | null;
  mostrar_contador: boolean;
  mostrar_resultados: boolean;
  color_primario: string;
  color_acento: string;
}

export type VotingPhase = "closed" | "upcoming" | "open" | "finished";

export interface VoteResponse {
  ok: boolean;
  code: "VOTO_REGISTRADO" | "NO_AUTORIZADO" | "VOTACION_CERRADA" | "CODIGO_INVALIDO" | "LIMITE_INTENTOS" | "ERROR";
  message: string;
}
