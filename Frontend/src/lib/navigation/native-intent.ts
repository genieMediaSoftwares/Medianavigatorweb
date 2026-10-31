/** Reject malformed external input before native routing reaches permissive query-string decoders. */
export function guardNativeIntent(path: string): string {
  if (!path || path.length > 4096 || /[\u0000-\u001f\u007f]/.test(path)) return '/';
  try {
    // The built-in decoder fails promptly on malformed percent escapes and invalid UTF-8.
    // Return the original string so valid reset/OAuth parameters are decoded exactly once by the router.
    decodeURIComponent(path);
    return path;
  } catch { return '/'; }
}
