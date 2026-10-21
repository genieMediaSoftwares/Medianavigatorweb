/** Release focus before Expo Router hides the outgoing screen from assistive technology. */
export function releaseNavigationFocus(): void {
  if (typeof document === 'undefined') return;
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
}
