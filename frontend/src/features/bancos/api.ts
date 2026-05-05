import { apiClient as httpClient } from "../../lib/httpClient";
import { BancoPreguntas, AsignacionBanco } from "../../types/contracts";

export const getBancos = async (): Promise<BancoPreguntas[]> => {
  const response = await httpClient.get("/bancos");
  return response.data;
};

export const getBancosAsignados = async (grupo_id: string): Promise<string[]> => {
  // TODO: endpoint aún no existe en la API: GET /bancos/asignados/{grupo_id}
  console.log("TODO: obtener bancos asignados para grupo", grupo_id);
  return [];
  // const response = await httpClient.get(`/bancos/asignados/${grupo_id}`);
  // return response.data;
};

export const asignarBanco = async (asignacion: AsignacionBanco): Promise<void> => {
  console.log("Mock POST /bancos/asignar", asignacion);
  // await httpClient.post("/bancos/asignar", asignacion);
};

export const desasignarBanco = async (asignacion: AsignacionBanco): Promise<void> => {
  console.log("Mock DELETE /bancos/asignar", asignacion);
  // await httpClient.delete("/bancos/asignar", { data: asignacion });
};