import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { GoogleAuthService } from './google-auth.service';

/**
 * Handles the *callback* from Google's OAuth flow.
 *
 * Expected redirect URI (in your Google Cloud config) should match:
 *   GOOGLE_REDIRECT_URI = "<backend>/auth/google/callback"
 *
 * Frontend sends the Supabase userId in the `state` param as:
 *   state = JSON.stringify({ userId: '<supabase-user-id>' })
 *
 * For backwards-compatibility, we also accept `?user_id=` if present.
 */
@Controller('auth/google')
export class GoogleAuthController {
    constructor(private readonly googleAuth: GoogleAuthService) { }

    @Get('callback')
    async handleGoogleCallback(
        @Query('code') code: string,
        @Query('state') state: string | undefined,
        @Query('user_id') userIdFromQuery: string | undefined,
        @Res() res: Response,
    ) {
        const frontendBase = process.env.FRONTEND_URL ?? 'http://localhost:5173';

        let userId: string | null = userIdFromQuery ?? null;

        // Prefer parsing `state` if present
        if (!userId && state) {
            try {
                const parsed = JSON.parse(state);
                if (parsed && typeof parsed.userId === 'string') {
                    userId = parsed.userId;
                }
            } catch (err) {
                console.error('Failed to parse OAuth state:', err);
            }
        }

        if (!code || !userId) {
            console.error('Missing code or userId in Google OAuth callback', {
                hasCode: Boolean(code),
                state,
                userIdFromQuery,
            });
            const redirectUrl = `${frontendBase}/?auth=error`;
            return res.redirect(302, redirectUrl);
        }

        try {
            await this.googleAuth.exchangeCodeForTokens(code, userId);
            console.log('Refresh Token saved for user:', userId);

            const redirectUrl = `${frontendBase}/?auth=success`;
            return res.redirect(302, redirectUrl);
        } catch (error) {
            console.error('Error handling Google callback:', error);
            const redirectUrl = `${frontendBase}/?auth=error`;
            return res.redirect(302, redirectUrl);
        }
    }
}
