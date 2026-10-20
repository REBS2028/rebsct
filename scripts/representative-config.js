// The lookup service has its own production Worker and storage.
// Loopback previews keep using the local service below.
export const representativeConfig = Object.freeze({
  productionApiBase: 'https://rebs-representative-lookup.rebs2028.workers.dev',
  stagingApiBase: '',
  stagingSiteOrigin: '',
  analyticsStreamReviewed: true,
});

export function apiBaseFor(location, config = representativeConfig) {
  if (['127.0.0.1', 'localhost'].includes(location.hostname)) return 'http://127.0.0.1:8787';
  const base = ['rebsct.com', 'www.rebsct.com'].includes(location.hostname) ? config.productionApiBase : location.origin === config.stagingSiteOrigin ? config.stagingApiBase : '';
  if (!base) return '';
  try { const url = new URL(base); return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/' ? url.origin : ''; } catch { return ''; }
}
