// Kept for compatibility — error mapping now lives in httpClient.ts
export type AppHttpError = { status: number; message: string; detail?: string; url?: string };
