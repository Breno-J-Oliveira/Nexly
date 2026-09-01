import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    if (!clientID || !clientSecret || !callbackURL) {
      const msg = 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL.';
      if (process.env.NODE_ENV === 'production') {
        throw new Error(msg);
      }
      new Logger('GoogleStrategy').warn(msg + ' Google login will be unavailable.');
    }

    super({
      clientID: clientID || 'placeholder-disabled',
      clientSecret: clientSecret || 'placeholder-disabled',
      callbackURL: callbackURL || 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
      state: true, // M1 fix: enable CSRF protection via state parameter
      passReqToCallback: true, // Required for custom state management
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    // NA3 FIX: Handle empty/missing emails array safely.
    const primaryEmail = profile.emails?.[0];
    if (!primaryEmail?.value) {
      return done(new Error('No email returned from Google OAuth.'), false);
    }

    const user = {
      provider: 'google',
      providerId: profile.id,
      email: primaryEmail.value,
      name: profile.displayName,
      emailVerified: primaryEmail.verified ?? false,
    };
    done(null, user);
  }
}
