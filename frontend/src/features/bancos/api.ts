import { apiClient } from "../../lib/httpClient";
import { BancoPreguntas, AsignacionBanco } from "../../types/contracts";

export const getBancos = async (): Promise<BancoPreguntas[]> => {
  const response = await apiClient.get("/api/v1/bancos/");
  return response.data;
};

export const asignarBanco = async (asignacion: AsignacionBanco): Promise<void> => {
  console.log("Mock POST /api/v1/bancos/asignar", asignacion);
  // await apiClient.post("/api/v1/bancos/asignar", asignacion);
};

export const desasignarBanco = async (asignacion: AsignacionBanco): Promise<void> => {
  console.log("Mock DELETE /api/v1/bancos/asignar", asignacion);
  // await apiClient.delete("/api/v1/bancos/asignar", { data: asignacion });
};