export function normalizeLinkCode(input: string): string {
  return input.trim().toUpperCase().slice(0, 6);
}
