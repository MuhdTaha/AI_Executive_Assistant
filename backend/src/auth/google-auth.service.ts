import { Injectable, InternalServerErrorException } from '@nestjs/common';
import fetch from 'node-fetch';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

/**
 * Handles talking to Google's OAuth token endpoint and
 * storing/retrieving the encrypted refresh token from Supabase.
 */
@Injectable()
export class GoogleAuthService {
    private readonly clientId = process.env.GOOGLE_CLIENT_ID ?? '';
    private readonly clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';
    private readonly redirectUri = process.env.GOOGLE_REDIRECT_URI ?? '';

    private readonly supabase: SupabaseClient;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceRole) {
            throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
        }

        // Service-role client (NO auth persist)
        this.supabase = createClient(supabaseUrl, supabaseServiceRole, {
            auth: { persistSession: false },
        });
    }

    /**
     * Step 2 of OAuth: exchange Google's one-time auth code for tokens.
     * Stores an *encrypted* refresh_token in Supabase (user_tokens table).
     */
    async exchangeCodeForTokens(code: string, userId: string) {
        const body = new URLSearchParams({
            code,
            client_id: this.clientId,
            client_secret: this.clientSecret,
            redirect_uri: this.redirectUri,
            grant_type: 'authorization_code',
        });

        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        });

        if (!res.ok) {
            const errorBody = await res.text();
            throw new InternalServerErrorException(
                `Failed to exchange Google auth code: ${res.status} ${errorBody}`,
            );
        }

        const tokens: any = await res.json();

        // Persist encrypted refresh_token for future offline access
        if (tokens.refresh_token) {
            const encrypted = this.encrypt(tokens.refresh_token);
            const { error } = await this.supabase
                .from('user_tokens')
                .upsert(
                    {
                        user_id: userId,
                        refresh_token: encrypted,
                    },
                    { onConflict: 'user_id' },
                );

            if (error) {
                throw new InternalServerErrorException(
                    `Failed to persist refresh token: ${error.message}`,
                );
            }
        }

        return tokens; // includes access_token, refresh_token, expiry, etc.
    }

    // --- Encryption helpers (AES-256-CBC) ---

    private encrypt(plainText: string): string {
        const key = process.env.ENCRYPTION_KEY;
        if (!key) {
            throw new Error('ENCRYPTION_KEY not set');
        }

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(
            'aes-256-cbc',
            Buffer.from(key, 'utf-8'),
            iv,
        );
        const encrypted = Buffer.concat([
            cipher.update(plainText, 'utf-8'),
            cipher.final(),
        ]);

        return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    }

    private decrypt(cipherText: string): string {
        const key = process.env.ENCRYPTION_KEY;
        if (!key) {
            throw new Error('ENCRYPTION_KEY not set');
        }

        // Backwards-safe: if it's not in "iv:cipher" format, just return it.
        if (!cipherText.includes(':')) {
            return cipherText;
        }

        const [ivHex, encryptedHex] = cipherText.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');

        const decipher = crypto.createDecipheriv(
            'aes-256-cbc',
            Buffer.from(key, 'utf-8'),
            iv,
        );
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]);

        return decrypted.toString('utf-8');
    }

    /**
     * Load and decrypt the refresh token for a user.
     */
    async getRefreshTokenForUser(userId: string): Promise<string | null> {
        const { data, error } = await this.supabase
            .from('user_tokens')
            .select('refresh_token')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            throw new InternalServerErrorException(
                `Failed to load refresh token: ${error.message}`,
            );
        }

        if (!data?.refresh_token) {
            return null;
        }

        return this.decrypt(data.refresh_token);
    }

    /**
     * Use the stored refresh token to get a *fresh* Google access token.
     */
    async getAccessTokenFromRefreshToken(
        userId: string,
    ): Promise<string | null> {
        const refreshToken = await this.getRefreshTokenForUser(userId);
        if (!refreshToken) return null;

        const body = new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        });

        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        });

        if (!res.ok) {
            const errorBody = await res.text();
            throw new InternalServerErrorException(
                `Failed to refresh Google access token: ${res.status} ${errorBody}`,
            );
        }

        const json: any = await res.json();
        return json.access_token ?? null;
    }
}
