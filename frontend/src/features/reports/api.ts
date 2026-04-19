import { apiClient } from "../../lib/httpClient";

export async function downloadPdf(uuid: string): Promise<Blob> {
  const response = await apiClient.get(`/docentes/reportes/pdf/${uuid}`, {
    responseType: "blob",
  });
  return response.data;
}
