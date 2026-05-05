import { z } from "zod";

export const healthSchema = z.object({
  estado: z.union([z.literal("ok"), z.literal("degradado")]),
  version: z.string(),
  entorno: z.string(),
});

export const sessionSchema = z.object({
  authenticated: z.boolean(),
  user: z
    .object({
      id: z.string().nullable().optional(),
      email: z.string().email().nullable().optional(),
    })
    .nullable(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const generateCodeSchema = z.object({
  id_grupo: z.string(),
  horas_validez: z.number().int().min(1).max(168),
});

export const codeResponseSchema = z.object({
  codigo_vinculacion: z.string().min(1),
  expires_at: z.string(),
});

export const analyticsMetricSchema = z.union([z.literal("errores"), z.literal("progreso")]);

export const analyticsItemSchema = z.object({
  alias_alumno: z.string(),
  uuid_estudiante: z.string().optional(),
  misiones_completas: z.number(),
  promedio_errores: z.number(),
  monedas_totales: z.number(),
  ultima_actividad: z.string(),
  errores_por_nivel: z.record(z.string(), z.number()).optional().default({}),
});

export const analyticsResponseSchema = z.object({
  id_grupo: z.string(),
  nombre_grupo: z.string(),
  total_alumnos: z.number(),
  metricas: z.array(analyticsItemSchema),
  generado_el: z.string(),
});

export const registerResponseSchema = z.object({
  authenticated: z.boolean(),
  email_confirmation_required: z.boolean(),
  user: z.object({
    id: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
  }).nullable(),
});

export type RegisterResponse = z.infer<typeof registerResponseSchema>;

export const crearGrupoRequestSchema = z.object({
  nombre_grupo: z.string().min(1).max(100),
  nombre_escuela: z.string().min(1).max(200),
});

export const grupoInfoSchema = z.object({
  id: z.string(),
  nombre_grupo: z.string(),
  docente_id: z.string(),
  codigo_acceso: z.string().nullable(),
  activo: z.boolean(),
  created_at: z.string(),
  nombre_escuela: z.string().nullable(),
  total_estudiantes: z.number(),
});

export const gruposListSchema = z.array(grupoInfoSchema);

export const crearGrupoResponseSchema = grupoInfoSchema;

export type HealthResponse = z.infer<typeof healthSchema>;
export type SessionResponse = z.infer<typeof sessionSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GenerateCodeInput = z.infer<typeof generateCodeSchema>;
export type CodeResponse = z.infer<typeof codeResponseSchema>;
export type AnalyticsMetric = z.infer<typeof analyticsMetricSchema>;
export type AnalyticsResponse = z.infer<typeof analyticsResponseSchema>;
export type CrearGrupoRequest = z.infer<typeof crearGrupoRequestSchema>;
export type CrearGrupoResponse = z.infer<typeof crearGrupoResponseSchema>;
export type GrupoInfo = z.infer<typeof grupoInfoSchema>;

export interface BancoPreguntas {
  id: string;
  nombre: string;
  descripcion: string | null;
  materia: string;
  nivel_grado: number;
  activo: boolean;
  total_preguntas?: number;
}

export interface AsignacionBanco {
  banco_id: string;
  grupo_id: string;
}
