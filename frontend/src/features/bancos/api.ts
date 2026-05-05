import { apiClient } from "../../lib/httpClient";

export interface Banco {
  id: string;
  nombre: string;
  materia: string;
  nivel: string;
  descripcion: string;
  total_preguntas: number;
}

export async function fetchBancos(): Promise<Banco[]> {
  const res = await apiClient.get("/bancos");
  return res.data;
}

export async function fetchBancosAsignados(grupoId: string): Promise<string[]> {
  const res = await apiClient.get(`/bancos/asignar/${grupoId}`);
  return res.data;
}

export async function asignarBanco(grupoId: string, bancoId: string): Promise<void> {
  await apiClient.post(`/bancos/asignar/${grupoId}/${bancoId}`);
}

export async function desasignarBanco(bancoId: string, grupoId: string): Promise<void> {
  await apiClient.delete(`/bancos/asignar/${grupoId}/${bancoId}`);
}
