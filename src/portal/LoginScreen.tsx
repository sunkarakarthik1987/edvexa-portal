import { useState, type FormEvent } from 'react';
import { STUDENT } from './data';

const INPUT_CLASS = 'w-full rounded-lg border border-rule bg-surface/60 px-3 py-2 text-sm text-ink';

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (email.trim() === '' || password.trim() === '') return;
    onLogin();
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="uh-card p-8">
          <p className="font-mono text-sm uppercase tracking-[0.18em] text-ink">Edvexa</p>
          <p className="mb-6 mt-0.5 text-[11px] text-ink-faint">Student portal</p>

          <h1 className="mb-6 text-xl font-semibold tracking-tight text-ink">Sign in</h1>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
              className={INPUT_CLASS}
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className={INPUT_CLASS}
            />
            <button type="submit" className="uh-btn-accent w-full">
              Sign in
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px] text-ink-faint">
          Demo prototype — any email and password signs you in as {STUDENT.name}. This is a UI
          gate, not real authentication.
        </p>
      </div>
    </div>
  );
}
