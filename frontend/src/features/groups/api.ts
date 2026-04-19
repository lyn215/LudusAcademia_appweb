import { apiClient } from "../../lib/httpClient";
import {
  crearGrupoRequestSchema,
  crearGrupoResponseSchema,
  gruposListSchema,
  type CrearGrupoRequest,
  type CrearGrupoResponse,
  type GrupoInfo,
} from "../../types/contracts";

export async function fetchGroups(): Promise<GrupoInfo[]> {
  const response = await apiClient.get("/docentes/grupos");
  return gruposListSchema.parse(response.data);
}

export async function createGroup(data: CrearGrupoRequest): Promise<CrearGrupoResponse> {
  const payload = crearGrupoRequestSchema.parse(data);
  const response = await apiClient.post("/docentes/grupos", payload);
  return crearGrupoResponseSchema.parse(response.data);
}
