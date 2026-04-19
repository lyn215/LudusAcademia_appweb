export type AppHttpError = { status: number; message: string; detail?: string; url?: string };

export interface MappedError {
  message: string;
  retryAfterSeconds?: number;
}

export function mapHttpError(status: number, body: Record<string, unknown> = {}): MappedError {
  const detail = (body.detail as string) ?? "Error inesperado";
  const friendly: Record<number, string> = {
    0:   "Sin respuesta del servidor (\u00bfest\u00e1 ca\u00eddo o hay CORS?)",
    401: "Sesion expirada o token invalido",
    403: "Sin permisos para esta accion",
    404: "Recurso no encontrado",
    422: `Datos invalidos: ${detail}`,
    500: "Error interno del servidor",
    503: "Servicio no disponible, reintenta en un momento",
  };
  const message = friendly[status] ?? `[${status}] ${detail}`;
  const result: MappedError = { message };
  if (typeof body.retry_after_seconds === "number") {
    result.retryAfterSeconds = body.retry_after_seconds;
  }
  return result;
}
