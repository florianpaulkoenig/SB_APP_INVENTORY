import { type FormEvent, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { COMPANY_NAME } from '../lib/constants';

// ---------------------------------------------------------------------------
// LoginPage
// ---------------------------------------------------------------------------
export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, session } = useAuth();

  // Auto-redirect when session becomes available (via shared context)
  useEffect(() => {
    if (session) {
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // MFA state
  const [showMfaChallenge, setShowMfaChallenge] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);

      // Check if MFA is required
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
        setShowMfaChallenge(true);
        setLoading(false);
        return; // Don't navigate yet — useAuth blocks session until MFA done
      }

      // Navigation happens automatically via the useEffect when session updates
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaVerify(e: FormEvent) {
    e.preventDefault();
    setMfaError('');
    setLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];
      if (!totpFactor) {
        setMfaError('No authenticator found.');
        setLoading(false);
        return;
      }

      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code: mfaCode,
      });
      if (verifyError) throw verifyError;

      // Refresh session so useAuth sees aal2 and exposes the session
      await supabase.auth.refreshSession();

      // Force a full reload so the app picks up the aal2 session
      window.location.reload();
      return; // keep loading state active during reload
    } catch {
      setMfaError('Invalid verification code. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="mb-10 text-center">
          <h1 className="font-display text-4xl font-bold text-primary-900">NOA x Simon Berger</h1>
          <p className="mt-1 text-xs font-medium tracking-[0.3em] text-primary-400">
            MANAGEMENT
          </p>
        </div>

        {showMfaChallenge ? (
          <>
            {/* MFA Challenge Heading */}
            <h2 className="mb-2 text-center text-lg font-medium text-primary-700">
              Two-Factor Authentication
            </h2>
            <p className="mb-6 text-center text-sm text-primary-500">
              Enter the 6-digit code from your authenticator app.
            </p>

            {/* MFA Form */}
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <Input
                label="Verification Code"
                value={mfaCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setMfaCode(val);
                }}
                placeholder="000000"
                maxLength={6}
                pattern="[0-9]{6}"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
              />

              {/* MFA Error display */}
              {mfaError && (
                <div className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2">
                  <p className="text-sm text-danger">{mfaError}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={mfaCode.length !== 6}
                className="w-full"
              >
                Verify
              </Button>

              <button
                type="button"
                onClick={() => {
                  setShowMfaChallenge(false);
                  setMfaCode('');
                  setMfaError('');
                  supabase.auth.signOut();
                }}
                className="w-full text-center text-sm text-primary-500 hover:text-primary-700 transition-colors"
              >
                Back to sign in
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Heading */}
            <h2 className="mb-6 text-center text-lg font-medium text-primary-700">
              Sign in to your account
            </h2>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />

              {/* Error display */}
              {error && (
                <div className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full"
              >
                Sign In
              </Button>
            </form>
          </>
        )}
      </div>

      {/* Footer */}
      <p className="mt-12 text-xs text-primary-400">{COMPANY_NAME}</p>
    </div>
  );
}
