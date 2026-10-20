/** Retornos de login sempre permanecem em páginas internas do Nexly. */
export function safeAuthDestination(value: string | null): string {
  if (
    !value ||
    value.length > 2048 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    [...value].some((character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)
  )
    return '/dashboard';
  try {
    const url = new URL(value, 'https://nexly.invalid');
    if (
      url.origin !== 'https://nexly.invalid' ||
      !/^\/[a-zA-Z0-9/_-]*$/.test(url.pathname) ||
      url.pathname.startsWith('//') ||
      ['/login', '/cadastro'].includes(url.pathname.replace(/\/$/, ''))
    )
      return '/dashboard';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/dashboard';
  }
}

export function authDestinationFromSearch(search: string): string {
  return safeAuthDestination(new URLSearchParams(search).get('next'));
}

export function authLink(page: '/login' | '/cadastro', destination: string): string {
  const safe = safeAuthDestination(destination);
  return safe === '/dashboard' ? page : `${page}?${new URLSearchParams({ next: safe })}`;
}

export function subscriptionDestination(plan: string): string {
  return ['BASIC', 'PRO', 'ENTERPRISE'].includes(plan)
    ? `/assinatura?plano=${plan}`
    : '/assinatura';
}
