import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MFAState {
  isEnrolled: boolean;
  isVerified: boolean;
  isLoading: boolean;
  factorId: string | null;
  qrCode: string | null;
  secret: string | null;
}

export function useMFA() {
  const [state, setState] = useState<MFAState>({
    isEnrolled: false,
    isVerified: false,
    isLoading: true,
    factorId: null,
    qrCode: null,
    secret: null,
  });

  // Check current MFA status
  const checkMFAStatus = useCallback(async () => {
    try {
      const { data: factors, error } = await supabase.auth.mfa.listFactors();
      
      if (error) {
        console.error('Error listing MFA factors:', error);
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const verifiedTOTP = factors.totp.find(f => f.status === 'verified');
      const unverifiedTOTP = factors.totp.find(f => f.status !== 'verified');

      // Check current AAL level
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const isVerified = aalData?.currentLevel === 'aal2';

      setState(prev => ({
        ...prev,
        isEnrolled: !!verifiedTOTP,
        isVerified,
        factorId: verifiedTOTP?.id || unverifiedTOTP?.id || null,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error checking MFA status:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    checkMFAStatus();
  }, [checkMFAStatus]);

  // Enroll in MFA - get QR code
  const enrollMFA = async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // First, unenroll any existing unverified factors
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const factor of factors?.totp || []) {
        if (factor.status !== 'verified') {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      // Enroll new factor
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });

      if (error) {
        toast.error('Błąd podczas konfiguracji 2FA: ' + error.message);
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      setState(prev => ({
        ...prev,
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error('Error enrolling MFA:', error);
      toast.error('Błąd podczas konfiguracji 2FA');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  // Verify enrollment with code from authenticator app
  const verifyEnrollment = async (code: string): Promise<boolean> => {
    try {
      if (!state.factorId) {
        toast.error('Brak aktywnej sesji 2FA');
        return false;
      }

      setState(prev => ({ ...prev, isLoading: true }));

      // Create challenge
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: state.factorId,
      });

      if (challengeError) {
        toast.error('Błąd: ' + challengeError.message);
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      // Verify with code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: state.factorId,
        challengeId: challenge.id,
        code,
      });

      if (verifyError) {
        toast.error('Nieprawidłowy kod: ' + verifyError.message);
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      toast.success('Weryfikacja dwuskładnikowa została włączona!');
      setState(prev => ({
        ...prev,
        isEnrolled: true,
        isVerified: true,
        qrCode: null,
        secret: null,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error('Error verifying MFA enrollment:', error);
      toast.error('Błąd podczas weryfikacji kodu');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  // Verify MFA for login (when already enrolled)
  const verifyMFA = async (code: string): Promise<boolean> => {
    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) {
        toast.error('Błąd: ' + factorsError.message);
        return false;
      }

      const totpFactor = factors.totp.find(f => f.status === 'verified');
      
      if (!totpFactor) {
        toast.error('Brak skonfigurowanego 2FA');
        return false;
      }

      setState(prev => ({ ...prev, isLoading: true }));

      // Create challenge
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

      if (challengeError) {
        toast.error('Błąd: ' + challengeError.message);
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      // Verify with code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code,
      });

      if (verifyError) {
        toast.error('Nieprawidłowy kod');
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      setState(prev => ({ ...prev, isVerified: true, isLoading: false }));
      return true;
    } catch (error) {
      console.error('Error verifying MFA:', error);
      toast.error('Błąd podczas weryfikacji');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  // Unenroll from MFA
  const unenrollMFA = async (): Promise<boolean> => {
    try {
      if (!state.factorId) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpFactor = factors?.totp[0];
        if (!totpFactor) {
          toast.error('Brak skonfigurowanego 2FA');
          return false;
        }
        setState(prev => ({ ...prev, factorId: totpFactor.id }));
      }

      setState(prev => ({ ...prev, isLoading: true }));

      const factorId = state.factorId || (await supabase.auth.mfa.listFactors()).data?.totp[0]?.id;
      
      if (!factorId) {
        toast.error('Brak skonfigurowanego 2FA');
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      const { error } = await supabase.auth.mfa.unenroll({ factorId });

      if (error) {
        toast.error('Błąd: ' + error.message);
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      toast.success('Weryfikacja dwuskładnikowa została wyłączona');
      setState({
        isEnrolled: false,
        isVerified: false,
        isLoading: false,
        factorId: null,
        qrCode: null,
        secret: null,
      });

      return true;
    } catch (error) {
      console.error('Error unenrolling MFA:', error);
      toast.error('Błąd podczas wyłączania 2FA');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  return {
    ...state,
    enrollMFA,
    verifyEnrollment,
    verifyMFA,
    unenrollMFA,
    refreshStatus: checkMFAStatus,
  };
}
