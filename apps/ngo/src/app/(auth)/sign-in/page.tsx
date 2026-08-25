// apps/ngo/src/app/sign-in/page.tsx
//
// Deliberately unstyled — a functional test screen for the auth backend, not
// a designed page. See docs/INTERFACE.md, which is on hold until the color
// scheme is decided. Replace the markup when that happens; leave the logic.

'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { codeLoginEmail } from '@/lib/auth/identity';

type Mode = 'code' | 'email';

// useSearchParams() opts the tree under it out of static prerendering unless
// wrapped in Suspense — Next fails the build otherwise. The form itself is
// pulled into its own component so the boundary is narrow.
export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';

  const [mode, setMode] = useState<Mode>('code');
  const [orgId, setOrgId] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const resolvedEmail = mode === 'code' ? codeLoginEmail(orgId, employeeCode) : email;

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    });

    setLoading(false);

    if (signInError) {
      // Same message regardless of which part was wrong — do not confirm or
      // deny whether an org id or employee code exists.
      setError('Those details did not match. Check them and try again.');
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 360, margin: '4rem auto', fontFamily: 'sans-serif' }}>
      <h1>Sign in</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button type="button" onClick={() => setMode('code')} disabled={mode === 'code'}>
          Org ID + code
        </button>
        <button type="button" onClick={() => setMode('email')} disabled={mode === 'email'}>
          Email
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mode === 'code' ? (
          <>
            <label>
              Organization ID
              <input value={orgId} onChange={(e) => setOrgId(e.target.value)} required />
            </label>
            <label>
              Employee code
              <input value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} required />
            </label>
          </>
        ) : (
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
        )}

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p style={{ color: 'crimson' }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p style={{ marginTop: 24, fontSize: 12 }}>
        First time here with a setup code? <a href="/activate">Activate your account</a>.
      </p>
    </div>
  );
}