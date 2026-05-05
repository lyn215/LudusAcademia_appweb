import { apiClient as httpClient } from "../../lib/httpClient";
import { BancoPreguntas, AsignacionBanco } from "../../types/contracts";

export const getBancos = async (): Promise<BancoPreguntas[]> => {
  const response = await httpClient.get("/bancos");
  return response.data;
};

export const getBancosAsignados = async (grupo_id: string): Promise<string[]> => {
  const response = await httpClient.get<string[]>(`/bancos/asignados/${grupo_id}`);
  return response.data;
};

export const asignarBanco = async (banco_id: string, grupo_id: string): Promise<void> => {
  await httpClient.post("/bancos/asignar", { banco_id, grupo_id });
};

export const desasignarBanco = async (banco_id: string, grupo_id: string): Promise<void> => {
  await httpClient.delete("/bancos/asignar", { data: { banco_id, grupo_id } });
};