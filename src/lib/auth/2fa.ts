import { supabase } from '@/integrations/supabase/client';

// Step 1: Enroll a new factor
export async function enrollFactor() {
    const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
    });
    if (error) {
        throw new Error(`Failed to enroll factor: ${error.message}`);
    }
    return data;
}

// Step 2: Verify the TOTP from the authenticator app
export async function challengeAndVerifyFactor(factorId: string, code: string) {
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
    });

    if (error) {
        throw new Error(`Failed to verify factor: ${error.message}`);
    }

    return data;
}

// Helper to get authentication assurance level
export async function getAssuranceLevel() {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) {
        throw new Error(`Failed to get assurance level: ${error.message}`);
    }
    return data;
}
