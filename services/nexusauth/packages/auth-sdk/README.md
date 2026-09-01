# @nexus/auth-sdk

SDK para integração com NexusAuth — middleware Express/NestJS, React hooks, validação JWT via JWKS.

## Instalação

```bash
npm install @nexus/auth-sdk
```

## Cliente HTTP

```ts
import { NexusAuthClient } from '@nexus/auth-sdk';

// Desenvolvimento: HTTP local
const client = new NexusAuthClient({ baseUrl: 'http://localhost:3000' });

// C30 FIX: Produção — usar SEMPRE HTTPS
const client = new NexusAuthClient({ baseUrl: 'https://auth.teudominio.com' });

const tokens = await client.login('user@example.com', 'password');
const newTokens = await client.refresh(tokens.refreshToken);
const me = await client.me(tokens.accessToken);
await client.logout(tokens.accessToken, tokens.refreshToken);
```

## React Provider

```tsx
import { AuthProvider } from '@nexus/auth-sdk';

// C29 FIX: Tokens armazenados em memória (não localStorage).
// Seguro contra XSS. Perdidos ao recarregar a página.
// Para persistência, usar httpOnly cookie + BFF proxy.
function App() {
  return (
    <AuthProvider baseUrl="https://auth.teudominio.com">
      <MeuApp />
    </AuthProvider>
  );
}
```

## Middleware Express

```ts
import { expressAuthMiddleware } from '@nexus/auth-sdk';

// C30 FIX: HTTPS obrigatório em produção (não localhost)
app.use('/api', expressAuthMiddleware({
  jwksUri: 'https://auth.teudominio.com/.well-known/jwks.json',
}));

app.use('/admin', expressAuthMiddleware({
  jwksUri: 'https://auth.teudominio.com/.well-known/jwks.json',
  requiredPermissions: ['users:read', 'users:write'],
}));
```

## Middleware NestJS

```ts
import { NexusAuthGuard, RequireNexusPermissions } from '@nexus/auth-sdk';

const guard = new NexusAuthGuard(new Reflector());
// C30 FIX: HTTPS obrigatório em produção
guard.setJwksUri('https://auth.teudominio.com/.well-known/jwks.json');

@UseGuards(NexusAuthGuard)
@RequireNexusPermissions('users:read')
@Controller('users')
class UsersController { ... }
```

## Verificação Manual JWT

```ts
import { JwksClient } from '@nexus/auth-sdk';

// C30 FIX: HTTPS obrigatório. Em dev (localhost) HTTP é permitido.
const jwks = new JwksClient('https://auth.teudominio.com/.well-known/jwks.json');
const user = await jwks.verifyToken(accessToken);
```

## Segurança

- **C29**: Tokens armazenados em memória (não localStorage). XSS não consegue roubá-los.
- **C30**: HTTPS obrigatório para JWKS em produção. MITM não consegue substituir chave pública.