import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface TokenPayload {
  id: number;
  email: string;
  perfil: string;
  iat: number;
  exp: number;
}

export function authMiddleware(req: Request & { userId?: number; userPerfil?: string }, res: Response, next: NextFunction) {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ error: 'Token de acesso não fornecido.' });
  }

  const token = authorization.replace('Bearer', '').trim();

  try {
    const data = jwt.verify(token, process.env.JWT_SECRET || 'chave_secreta_fallback');
    const { id, perfil } = data as TokenPayload;

    req.userId = id;
    req.userPerfil = perfil;

    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}