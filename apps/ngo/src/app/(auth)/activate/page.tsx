// apps/ngo/src/app/activate/page.tsx
//
// Redeems a setup token issued by an admin (see lib/auth/setup-tokens.ts),
// then signs the person straight in. Test screen — see the note in
// sign-in/page.tsx about styling being deferred.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/identity';

export default function ActivatePage() {
  const router = useRouter();

  const [orgId, setOrgId] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const res = await fetch('/api/auth/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId, employeeCode, token, password }),
    });
    const body = await res.json();

    if (!res.ok) {
      setLoading(false);
      setError(body.error ?? 'Something went wrong.');
      return;
    }

    // Account now exists and is linked. Sign in immediately rather than
    // sending the person back to a second form.
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: body.email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError('Account created, but sign-in failed. Try signing in from the sign-in page.');
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 360, margin: '4rem auto', fontFamily: 'sans-serif' }}>
      <h1>Activate your account</h1>
      <p style={{ fontSize: 13, color: '#555' }}>
        Use the organization ID, your employee code, and the setup code your administrator gave you.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label>
          Organization ID
          <input value={orgId} onChange={(e) => setOrgId(e.target.value)} required />
        </label>
        <label>
          Employee code
          <input value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} required />
        </label>
        <label>
          Setup code
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="K3M9-QW2T-8XPR"
            required
          />
        </label>
        <label>
          New password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </label>
        <label>
          Confirm password
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </label>

        {error && <p style={{ color: 'crimson' }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Activating…' : 'Activate'}
        </button>
      </form>
    </div>
  );
}