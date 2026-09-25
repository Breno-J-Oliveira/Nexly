import { NextRequest, NextResponse } from 'next/server';

/**
 * Em produção (split Vercel + Railway), o cookie `refreshToken` é HttpOnly e
 * fica no domínio da API (api-*.up.railway.app), NÃO no domínio do frontend
 * (nexly-web.vercel.app). Portanto o middleware não consegue lê-lo aqui.
 *
 * A proteção real das rotas é feita no client (AuthGuard), que usa o
 * `accessToken` em memória + o fluxo de refresh com `withCredentials`.
 */
export function middleware(_request: NextRequest): NextResponse {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};

