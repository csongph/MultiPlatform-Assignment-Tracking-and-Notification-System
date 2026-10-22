/*
 * Runtime API configuration for the static frontend.
 * For a split deployment, set DEPLOYED_API_BASE to the deployed backend URL.
 */
(function configureKmapsApi() {
  const DEPLOYED_API_BASE = '';
  const localHosts = new Set(['localhost', '127.0.0.1']);
  const hostname = window.location.hostname;
  const isLocal = localHosts.has(hostname);
  const isPrivateLanIpv4 = (() => {
    const parts = hostname.split('.').map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
      return false;
    }
    return parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168);
  })();
  const defaultApiBase = isLocal
    ? `${window.location.protocol}//${hostname}:8000/api/v1`
    : isPrivateLanIpv4
      ? `${window.location.protocol}//${hostname}:8000/api/v1`
      : `${window.location.origin}/api/v1`;

  // Deliberate deployment override point for static hosting.
  window.KMAPS_API_BASE = (window.KMAPS_API_BASE || DEPLOYED_API_BASE || defaultApiBase).replace(/\/$/, '');
})();
