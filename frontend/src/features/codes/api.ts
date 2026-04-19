import { apiClient } from "../../lib/httpClient";
import { codeResponseSchema, generateCodeSchema, type CodeResponse, type GenerateCodeInput } from "../../types/contracts";

export async function createLinkCode(data: GenerateCodeInput): Promise<CodeResponse> {
  const payload = generateCodeSchema.parse(data);
  const response = await apiClient.post("/docentes/codigos", payload);
  return codeResponseSchema.parse(response.data);
}
