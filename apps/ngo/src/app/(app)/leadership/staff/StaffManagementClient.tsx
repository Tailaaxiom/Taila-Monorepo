// apps/ngo/src/app/leadership/staff/StaffManagementClient.tsx
'use client';

// Deliberately plain, like /sign-in and /activate — a functional screen to
// prove the backend, not a designed page. See docs/INTERFACE.md, on hold.

import { useState } from 'react';
import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { createClient } from '@/lib/supabase/client';

export interface EmployeeListItem {
  id: string;
  employee_code: string;
  full_name: string;
  role: string;
  department: string | null;
  email: string | null;
  login_mode: 'code' | 'email';
  active: boolean;
  auth_user_id: string | null;
  created_at: string;
}

const ROLES = ['staff', 'hod', 'leadership', 'finance', 'hr', 'admin', 'donor'] as const;

export function StaffManagementClient({
  orgId,
  initialEmployees,
}: {
  orgId: string;
  initialEmployees: EmployeeListItem[];
}) {
  usePageTitle('Staff Management');

  const [employees, setEmployees] = useState(initialEmployees);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // { [employeeId]: { token, expiresAt } | 'loading' | error string }
  const [tokenResults, setTokenResults] = useState<
    Record<string, { token: string; expiresAt: string } | 'loading' | string>
  >({});

  async function refreshList() {
    const supabase = createClient();
    const { data } = await supabase
      .from('employees')
      .select('id, employee_code, full_name, role, department, email, login_mode, active, auth_user_id, created_at')
      .order('created_at', { ascending: false });
    if (data) setEmployees(data as EmployeeListItem[]);
  }

  async function handleAddEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const loginMode = form.get('login_mode') as 'code' | 'email';
    const email = (form.get('email') as string) || null;

    if (loginMode === 'email' && !email) {
      setSubmitting(false);
      setFormError('Email-mode accounts need an email address.');
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from('employees').insert({
      org_id: orgId,
      employee_code: form.get('employee_code') as string,
      full_name: form.get('full_name') as string,
      role: form.get('role') as string,
      department: (form.get('department') as string) || null,
      email,
      login_mode: loginMode,
    });

    setSubmitting(false);

    if (error) {
      // Most likely cause: employee_code already used in this org — see the
      // employees_code_unique_per_org constraint in 0002_tenancy_people.sql.
      setFormError(error.message);
      return;
    }

    (e.target as HTMLFormElement).reset();
    await refreshList();
  }

  async function handleIssueToken(employeeId: string) {
    setTokenResults((prev) => ({ ...prev, [employeeId]: 'loading' }));

    const res = await fetch('/api/auth/issue-setup-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId }),
    });
    const body = await res.json();

    setTokenResults((prev) => ({
      ...prev,
      [employeeId]: res.ok ? { token: body.token, expiresAt: body.expiresAt } : body.error,
    }));
  }

  return (
    <div style={{ maxWidth: 720, fontFamily: 'sans-serif' }}>
      <h1>Staff Management</h1>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16 }}>Add employee</h2>
        <form
          onSubmit={handleAddEmployee}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 480 }}
        >
          <label>
            Employee code
            <input name="employee_code" required />
          </label>
          <label>
            Full name
            <input name="full_name" required />
          </label>
          <label>
            Role
            <select name="role" defaultValue="staff">
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            Department
            <input name="department" />
          </label>
          <label>
            Login mode
            <select name="login_mode" defaultValue="code">
              <option value="code">Org ID + code (field staff)</option>
              <option value="email">Email (desk roles, donors)</option>
            </select>
          </label>
          <label>
            Email
            <input name="email" type="email" />
          </label>

          {formError && (
            <p style={{ color: 'crimson', gridColumn: '1 / -1' }}>{formError}</p>
          )}

          <button type="submit" disabled={submitting} style={{ gridColumn: '1 / -1' }}>
            {submitting ? 'Adding…' : 'Add employee'}
          </button>
        </form>
      </section>

      <section>
        <h2 style={{ fontSize: 16 }}>Directory ({employees.length})</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              <th>Code</th>
              <th>Name</th>
              <th>Role</th>
              <th>Login</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const result = tokenResults[emp.id];
              return (
                <tr key={emp.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td>{emp.employee_code}</td>
                  <td>{emp.full_name}</td>
                  <td>{emp.role}</td>
                  <td>{emp.login_mode}</td>
                  <td>
                    {emp.auth_user_id ? (
                      <span style={{ color: 'green' }}>Active</span>
                    ) : (
                      <span style={{ color: '#b8860b' }}>Not activated</span>
                    )}
                  </td>
                  <td>
                    {!emp.auth_user_id && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleIssueToken(emp.id)}
                          disabled={result === 'loading'}
                        >
                          {result === 'loading' ? 'Issuing…' : 'Issue setup token'}
                        </button>
                        {result && result !== 'loading' && (
                          typeof result === 'string' ? (
                            <p style={{ color: 'crimson', fontSize: 12 }}>{result}</p>
                          ) : (
                            <div style={{ fontSize: 12, marginTop: 4 }}>
                              <p>
                                Code: <strong>{result.token}</strong>{' '}
                                <em>(shown once — relay it now, it is not recoverable)</em>
                              </p>
                              <p>
                                Expires: {new Date(result.expiresAt).toLocaleString()}
                              </p>
                            </div>
                          )
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}