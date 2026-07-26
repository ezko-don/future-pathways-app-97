// Pure phone-number normalization, shared by the M-Pesa and WhatsApp
// integrations so a Kenyan number always ends up in the same "2547XXXXXXXX"
// form regardless of which channel it came in through. No env/secrets here,
// safe to import from client or server code.
export function normalizePhoneNumber(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if ((digits.startsWith("7") || digits.startsWith("1")) && digits.length === 9)
    return `254${digits}`;
  throw new Error("Enter a valid Kenyan phone number, e.g. 0712345678.");
}
