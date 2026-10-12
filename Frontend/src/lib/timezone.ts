/** The device's IANA time zone (e.g. "Asia/Kolkata"), or null when the device does not report one. */
export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}
