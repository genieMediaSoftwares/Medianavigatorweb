/** Inspect options only; never return a credential-bearing connection string. */
export function secureDatabaseTransport(uri: string): boolean {
  const options = new URLSearchParams(uri.split('?')[1] ?? '');
  let explicitlyEnabled = false;
  for (const [name, value] of options) {
    const key = name.toLowerCase();
    if (key === 'tls' || key === 'ssl') {
      if (value !== 'true') return false;
      explicitlyEnabled = true;
    }
    if (['tlsinsecure', 'tlsallowinvalidcertificates', 'tlsallowinvalidhostnames'].includes(key) && value !== 'false') return false;
  }
  return uri.startsWith('mongodb+srv://') || (uri.startsWith('mongodb://') && explicitlyEnabled);
}
