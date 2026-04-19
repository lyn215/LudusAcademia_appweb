import axios, { AxiosError } from "axios";
import axiosRetry from "axios-retry";
import { supabase } from "./supabaseClient";
import { emitError } from "./errorBus";

const LUDUS_API = (import.meta.env.VITE_LUDUS_API_URL as string | undefined)?.replace(/\/$/, "");

if (!LUDUS_API) {
  console.error("[httpClient] VITE_LUDUS_API_URL no está definida en .env");
}

export const apiClient = axios.create({
  baseURL: LUDUS_API,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

// Adjunta JWT de Supabase automáticamente
apiClient.interceptors.request.use(async (config) => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("[httpClient] Error obteniendo sesión de Supabase:", error.message);
  }
  const token = data?.session?.access_token;
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  } else {
    console.warn("[httpClient] Sin token de sesión para:", config.url);
  }
  return config;
});

axiosRetry(apiClient, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (err) => !err.response || err.response.status === 503,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<Record<string, unknown>>) => {
    const status  = error.response?.status ?? 0;
    const url     = error.config?.url ?? "desconocida";
    const body    = error.response?.data;
    const detail  = (body?.detail as string) || error.message || "Error inesperado";

    // Mensajes amigables por código
    const friendly: Record<number, string> = {
      0:   `Sin respuesta del servidor (¿está caído o hay CORS?) → ${url}`,
      401: `Sesión expirada o token inválido → ${url}`,
      403: `Sin permisos para esta acción → ${url}`,
      404: `Recurso no encontrado → ${url}`,
      422: `Datos inválidos: ${detail} → ${url}`,
      500: `Error interno del servidor → ${url}`,
      503: `Servicio no disponible, reintenta en un momento → ${url}`,
    };

    const message = friendly[status] ?? `[${status}] ${detail} → ${url}`;
    console.error(`[httpClient] ${message}`, { status, body, error });
    emitError(message);

    return Promise.reject({ status, message, detail, url });
  }
);
