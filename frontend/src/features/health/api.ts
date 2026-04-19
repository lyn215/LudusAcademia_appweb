import { apiClient } from "../../lib/httpClient";
import { healthSchema, type HealthResponse } from "../../types/contracts";

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await apiClient.get("/health");
  return healthSchema.parse(response.data);
}
