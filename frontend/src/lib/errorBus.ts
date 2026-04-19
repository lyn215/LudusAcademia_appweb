type ErrorListener = (message: string) => void;
const listeners = new Set<ErrorListener>();

export function subscribeErrors(listener: ErrorListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitError(message: string): void {
  listeners.forEach((l) => l(message));
}
