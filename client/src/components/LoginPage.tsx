import { useState } from 'react';
import type { FormEvent } from 'react';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onLogin(username, password);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:py-14">
      <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-[1.1fr_0.9fr]">
        <section className="card hidden p-8 md:block">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Wedding Ops</p>
          <h1 className="mt-3 text-4xl leading-tight text-slate-900">Run guests, events, stays, and logistics in one place.</h1>
          <p className="mt-4 max-w-md text-sm text-slate-600">
            Track RSVP progress, assign accommodations, monitor tasks, and manage imports from a single dashboard.
          </p>
        </section>

        <form onSubmit={submit} className="card space-y-4 p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Welcome Back</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Sign In</h2>
            <p className="mt-1 text-sm text-slate-500">Default account: `admin` / `password`</p>
          </div>
          <input className="input" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn-primary w-full" type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
