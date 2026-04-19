import { apiClient } from "../../lib/httpClient";
import { analyticsMetricSchema, analyticsResponseSchema, type AnalyticsMetric, type AnalyticsResponse } from "../../types/contracts";

export async function fetchAnalytics(idGrupo: number, metrica: AnalyticsMetric): Promise<AnalyticsResponse> {
  const metric = analyticsMetricSchema.parse(metrica);
  const response = await apiClient.get(`/docentes/analitica/grupo/${idGrupo}`, {
    params: { metrica: metric },
  });
  return analyticsResponseSchema.parse(response.data);
}
