// ---------------------------------------------------------------------------
// NOA Inventory -- Two-Factor Authentication Settings
// Manage TOTP-based MFA enrollment and unenrollment.
// ---------------------------------------------------------------------------

import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MfaStatus = 'loading' | 'not_enrolled' | 'enrolling' | 'enrolled';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TwoFactorSettings() {
  const [status, setStatus] = useState<MfaStatus>('loading');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // -- Check current MFA status -----------------------------------------------

  const checkMfaStatus = useCallback(async () => {
    try {
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;

      const verifiedFactor = data?.totp?.find((f) => f.status === 'verified');
      if (verifiedFactor) {
        setFactorId(verifiedFactor.id);
        setStatus('enrolled');
      } else {
        setFactorId(null);
        setStatus('not_enrolled');
      }
    } catch {
      setStatus('not_enrolled');
    }
  }, []);

  useEffect(() => {
    checkMfaStatus();
  }, [checkMfaStatus]);

  // -- Enroll -----------------------------------------------------------------

  async function handleEnroll() {
    setError('');
    setLoading(true);
    try {
      // Remove any unverified factors from previous attempts
      const { data: existing } = await supabase.auth.mfa.listFactors();
      const unverified = existing?.totp?.filter((f) => f.status === 'unverified') ?? [];
      for (const f of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'NOA Authenticator',
      });
      if (enrollError) throw enrollError;

      setQrCode(data.totp.qr_code);
      setEnrollFactorId(data.id);
      setStatus('enrolling');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start enrollment.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // -- Verify enrollment ------------------------------------------------------

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (!enrollFactorId || verifyCode.length !== 6) return;

    setError('');
    setLoading(true);
    try {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: enrollFactorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollFactorId,
        challengeId: challenge.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      // Successfully enrolled — update local state immediately
      setVerifyCode('');
      setQrCode(null);
      setEnrollFactorId(null);
      setFactorId(enrollFactorId);
      setIsEnrolled(true);
    } catch {
      setError('Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // -- Unenroll ---------------------------------------------------------------

  async function handleUnenroll() {
    if (!factorId) return;

    setError('');
    setLoading(true);
    try {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId,
      });
      if (unenrollError) throw unenrollError;

      setFactorId(null);
      setStatus('not_enrolled');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to disable 2FA.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // -- Cancel enrollment ------------------------------------------------------

  function handleCancelEnroll() {
    // If we started enrollment but user cancels, unenroll the unverified factor
    if (enrollFactorId) {
      supabase.auth.mfa.unenroll({ factorId: enrollFactorId }).catch(() => {
        // Ignore errors on cancel
      });
    }
    setQrCode(null);
    setEnrollFactorId(null);
    setVerifyCode('');
    setError('');
    setStatus('not_enrolled');
  }

  // -- Loading state ----------------------------------------------------------

  if (status === 'loading') {
    return (
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </section>
    );
  }

  // -- Render -----------------------------------------------------------------

  return (
    <section className="rounded-lg border border-primary-100 bg-white p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-base font-semibold text-primary-900">
            Two-Factor Authentication
          </h2>
          {status === 'enrolled' && (
            <Badge variant="success">Enabled</Badge>
          )}
        </div>
      </div>

      <p className="mb-4 text-sm text-primary-500">
        Add an extra layer of security by requiring a verification code from an
        authenticator app when signing in.
      </p>

      {/* Error display */}
      {error && (
        <div className="mb-4 rounded-md border border-danger/20 bg-danger/5 px-3 py-2">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* -- Not enrolled state ------------------------------------------------ */}
      {status === 'not_enrolled' && (
        <Button onClick={handleEnroll} loading={loading}>
          Enable Two-Factor Authentication
        </Button>
      )}

      {/* -- Enrolling state --------------------------------------------------- */}
      {status === 'enrolling' && qrCode && (
        <div className="space-y-4">
          <div className="rounded-lg border border-primary-100 bg-primary-50 p-4">
            <p className="mb-3 text-sm font-medium text-primary-700">
              1. Scan this QR code with your authenticator app
            </p>
            <div className="flex justify-center">
              <img
                src={qrCode}
                alt="Two-factor authentication QR code"
                className="h-48 w-48 rounded-md border border-primary-200 bg-white p-2"
              />
            </div>
          </div>

          <form onSubmit={handleVerify} className="space-y-3">
            <p className="text-sm font-medium text-primary-700">
              2. Enter the 6-digit verification code from your app
            </p>
            <Input
              label="Verification Code"
              value={verifyCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerifyCode(val);
              }}
              placeholder="000000"
              maxLength={6}
              pattern="[0-9]{6}"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
            <div className="flex gap-3">
              <Button type="submit" loading={loading} disabled={verifyCode.length !== 6}>
                Verify &amp; Enable
              </Button>
              <Button variant="outline" onClick={handleCancelEnroll} disabled={loading}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* -- Enrolled state ---------------------------------------------------- */}
      {status === 'enrolled' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
            <svg
              className="h-5 w-5 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
            <p className="text-sm font-medium text-emerald-800">
              Two-factor authentication is active.
            </p>
          </div>
          <Button variant="danger" size="sm" onClick={handleUnenroll} loading={loading}>
            Disable Two-Factor Authentication
          </Button>
        </div>
      )}
    </section>
  );
}
