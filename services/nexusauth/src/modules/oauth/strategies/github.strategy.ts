import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  private readonly logger = new Logger(GithubStrategy.name);

  constructor(private configService: ConfigService) {
    // NA1+NA2 FIX: Never use placeholder credentials. If GitHub OAuth is not configured,
    // the strategy should fail fast — otherwise an attacker could register a fake OAuth
    // app with client_id 'placeholder' and impersonate any user.
    const clientID = configService.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = configService.get<string>('GITHUB_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GITHUB_CALLBACK_URL');

    if (!clientID || !clientSecret || !callbackURL) {
      const msg = 'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_CALLBACK_URL.';
      if (process.env.NODE_ENV === 'production') {
        throw new Error(msg);
      }
      new Logger('GithubStrategy').warn(msg + ' GitHub login will be unavailable.');
    }

    super({
      clientID: clientID || 'placeholder-disabled',
      clientSecret: clientSecret || 'placeholder-disabled',
      callbackURL: callbackURL || 'http://localhost:3000/auth/github/callback',
      scope: ['user:email'],
      state: true, // M1 fix: enable CSRF protection via state parameter
      passReqToCallback: true, // Required for custom state management
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    // NA3 FIX: Handle empty/missing emails array safely — profile.emails can be
    // undefined or empty in edge cases (e.g. GitHub user with no public email).
    const primaryEmail = profile.emails?.[0];
    if (!primaryEmail?.value) {
      return done(new Error('No email returned from GitHub. Ensure the user:email scope is granted.'), false);
    }

    const user = {
      provider: 'github',
      providerId: profile.id,
      email: primaryEmail.value,
      name: profile.displayName || profile.username,
      emailVerified: primaryEmail.verified ?? false,
    };
    done(null, user);
  }
}
