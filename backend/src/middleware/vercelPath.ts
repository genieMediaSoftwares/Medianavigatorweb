import type { Request, Response, NextFunction } from 'express';

// Path normalization (ensures seamless routing on Vercel and reverse proxies)
export function vercelPath(req: Request, _res: Response, next: NextFunction) {
  // 1. Recover path from Vercel matched path or original URL headers if stripped by rewrite
  const matchedPath = (req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'] || req.headers['x-forwarded-url']) as string | undefined;
  if (matchedPath && (matchedPath.startsWith('/api/v1') || matchedPath.startsWith('/v1')) && !req.url.startsWith('/api/v1') && !req.url.startsWith('/v1')) {
    req.url = matchedPath.startsWith('/v1') ? '/api' + matchedPath : matchedPath;
  }

  // 2. Recover path from Vercel query parameter (e.g. rewrite ?path=$1 or ?__path=$1)
  if (req.query && (req.query.path || req.query.__path)) {
    const rawPath = req.query.path || req.query.__path;
    const p = Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath);
    if (p && !req.url.includes(p)) {
      req.url = '/api/' + p.replace(/^\//, '');
    }
  }

  // 3. Normalize url: if it starts with /v1/, prefix with /api
  if (req.url.startsWith('/v1/')) {
    req.url = '/api' + req.url;
  }

  next();
}
