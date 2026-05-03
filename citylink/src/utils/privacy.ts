/**
 * 🛡️ CityLink Privacy & Data Protection Utility
 *
 * Enforces Ethiopian Proclamation 1262/2021 (Data Protection)
 * by sanitizing PII (Personally Identifiable Information) before logging.
 */

/**
 * Strips UUIDs, Ethiopian phone numbers, and tokens from strings/objects.
 */
export const obfuscatePII = (input: any): any => {
  if (typeof input !== 'string') {
    try {
      input = JSON.stringify(input);
    } catch {
      return '[Complex Object]';
    }
  }

  return input
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':uuid') // Strip UUIDs
    .replace(/(09|07)[0-9]{8}/g, ':phone') // Strip Ethiopian phone numbers
    .replace(/(?<=token=)[^&]+/g, ':token') // Strip tokens
    .replace(/(?<="token":")[^"]+/g, ':token') // Strip JSON tokens
    .replace(/(?<="password":")[^"]+/g, ':redacted') // Strip passwords
    .replace(/(?<="pin":")[^"]+/g, ':redacted') // Strip PINs
    .replace(/(?<="wallet_pin":")[^"]+/g, ':redacted'); // Strip Wallet PINs
};

/**
 * Securely logs events without leaking sensitive data.
 */
export const secureLog = (message: string, data?: any) => {
  const sanitizedData = data ? JSON.parse(obfuscatePII(data)) : null;
  console.log(`[SECURE LOG] ${message}`, sanitizedData);
};
