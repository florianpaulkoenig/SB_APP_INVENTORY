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

      // Check if MFA is required
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
        setShowMfaChallenge(true);
        setLoading(false);
        return; // Don't navigate yet — useAuth blocks session until MFA done
      }

      // Non-MFA login: keep spinner active while AuthContext processes the
      // SIGNED_IN event and sets session. The useEffect above watching
      // `session` will navigate and unmount this component. If something goes
      // wrong and navigation never happens the user can refresh manually, but
      // at least they don't see a blank "nothing happened" state.
    } catch {
      setError('Invalid email or password. Please try again.');
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

      // verify() writes the AAL2 session to localStorage synchronously.
      // We do a hard replace to '/' so AuthContext re-reads the new session
      // cleanly — relying on onAuthStateChange alone is unreliable when the
      // MFA form was shown via the hard-refresh detection path (no preceding
      // signInWithPassword in this render cycle).
      window.location.replace('/');
    } catch {
      setMfaError('Invalid verification code. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 px-4">
      <div className="w-full max-w-xs">
        {/* Brand */}
        <h1 className="mb-12 text-center font-display text-2xl font-bold tracking-tight text-primary-900">
          {COMPANY_NAME}
        </h1>

        {showMfaChallenge ? (
          <div className="space-y-5">
            <p className="text-center text-sm text-primary-400">
              Enter the 6-digit code from your authenticator app.
            </p>

            <form onSubmit={handleMfaVerify} className="space-y-5">
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
                className="text-center text-lg tracking-[0.5em] py-3"
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
                className="block w-full text-center text-xs text-primary-400 hover:text-primary-600 transition-colors"
              >
                Back
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="py-2.5"
            />

            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="py-2.5"
            />

            {error && (
              <p className="text-center text-xs text-danger">{error}</p>
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
        )}
      </div>
    </div>
  );
}
