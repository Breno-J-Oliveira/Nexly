import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '../auth/jwt.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller()
export class JwksController {
  constructor(private jwtService: JwtService) {}

  @Public()
  @Get('.well-known/jwks.json')
  jwks() {
    return this.jwtService.getJwks();
  }

  @Public()
  @Get('.well-known/openid-configuration')
  openidConfiguration(@Req() req: Request) {
    // V8 FIX: Build absolute issuer URL from the request to prevent Host header
    // injection attacks. An attacker manipulating the Host header could redirect
    // OIDC clients to a malicious JWKS endpoint if a relative URI is used.
    // RFC 8414 requires absolute URIs for issuer and jwks_uri.
    const protocol = req.protocol || 'https';
    const host = req.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    return {
      issuer: process.env.JWT_ISSUER || baseUrl,
      jwks_uri: `${baseUrl}/.well-known/jwks.json`,
      response_types_supported: ['id_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
    };
  }
}
