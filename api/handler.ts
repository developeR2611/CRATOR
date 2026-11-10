import type { Request, Response } from 'express';
import app from '../src/server/app.ts';

export default function handler(req: Request, res: Response) {
  const incomingUrl = new URL(req.url || '/', 'http://vercel.internal');
  const apiPath = incomingUrl.searchParams.get('__path');

  if (!apiPath) {
    return res.status(400).json({ error: 'API path is required' });
  }

  incomingUrl.searchParams.delete('__path');
  const search = incomingUrl.searchParams.toString();
  const cleanPath = apiPath.startsWith('/') ? apiPath.slice(1) : apiPath;
  req.url = `/api/${cleanPath}${search ? `?${search}` : ''}`;

  return app(req, res);
}
