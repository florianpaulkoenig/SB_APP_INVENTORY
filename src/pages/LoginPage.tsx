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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // MFA state
  const [showMfaChallenge, setShowMfaChallenge] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');

  // Auto-redirect whenever the session is set — covers both normal login and
  // post-MFA-verify (onAuthStateChange fires MFA_CHALLENGE_VERIFIED which
  // updates session in AuthContext, triggering this effect).
  useEffect(() => {
    if (session) {
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

  // On mount: if Supabase already has an AAL1 session (e.g. after hard
  // refresh) skip the password form and go straight to the MFA step.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!s) return;
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
        setShowMfaChallenge(true);
      }
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch {
      setError('Invalid email or password. Please try again.');
      setLoading(false);
      return;
    }

    // Check if MFA is required — separate try/catch so a check failure
    // doesn't show "invalid password". Default to showing MFA if uncertain.
    try {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
        setShowMfaChallenge(true);
        setLoading(false);
        return;
      }
      // Non-MFA: session will be set via onAuthStateChange → useEffect navigates.
    } catch {
      // MFA check failed — show the MFA form to be safe rather than skipping it.
      setShowMfaChallenge(true);
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

      // Navigate to the app. window.location.replace ensures a clean page
      // load so AuthContext re-reads the AAL2 session via getSession() and
      // ProtectedRoute lets the user in without an additional manual refresh.
      window.location.replace('/');
    } catch {
      setMfaError('Invalid verification code. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#e8e8e8] px-4">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Brand */}
        <h1 className="mb-16 text-center font-display text-base font-normal tracking-widest text-primary-900">
          NOA <span className="lowercase">contemporary</span>
        </h1>

        {showMfaChallenge ? (
          <form onSubmit={handleMfaVerify} className="w-full flex flex-col items-center gap-8">
            <p className="text-center text-sm text-primary-400">
              Enter the 6-digit code from your authenticator app.
            </p>

            <Input
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
              className="text-center text-lg tracking-[0.5em] py-3 placeholder:text-center"
            />

            {mfaError && (
              <p className="text-center text-xs text-danger">{mfaError}</p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={mfaCode.length !== 6}
              className="w-3/5"
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
              className="text-xs text-primary-400 hover:text-primary-600 transition-colors"
            >
              Back
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-8">
            <div className="w-full flex flex-col gap-6">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="py-3 text-center placeholder:text-center"
              />

              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="py-3 text-center placeholder:text-center"
              />
            </div>

            {error && (
              <p className="text-center text-xs text-danger">{error}</p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-3/5"
            >
              Sign In
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
