/** True when the pathname has two or more segments (e.g. `/products/foo`). */
export function isNestedCustomerPath(pathname: string): boolean {
  return pathname.split('/').filter(Boolean).length >= 2;
}

/** Parent path for a nested route — e.g. `/products/foo` → `/products`. */
export function customerPathParent(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length <= 1) return '/';
  return `/${segments.slice(0, -1).join('/')}`;
}
