export function getSafeReturnTo(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
    return '/';
  }

  const destination = new URL(path, window.location.origin);
  if (
    destination.origin !== window.location.origin
    || ['/login', '/register'].includes(destination.pathname)
  ) {
    return '/';
  }

  return `${destination.pathname}${destination.search}${destination.hash}`;
}
