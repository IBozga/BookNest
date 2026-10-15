import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  onContinueBrowsing: () => void;
}

const inputClass =
  'w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900 text-xs';

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onContinueBrowsing }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { user } = await api.login(email.trim(), password);
      setPassword('');
      onLoginSuccess(user);
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 w-full">
      <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-serif font-semibold text-stone-900 tracking-tight">Sign in</h1>
          <p className="text-xs text-stone-500">
            Access your orders, recommendations and gift points.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs" noValidate>
          {error && (
            <div
              role="alert"
              className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 font-medium"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="login-email" className="block mb-1 font-semibold text-stone-800">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              required
              maxLength={180}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block mb-1 font-semibold text-stone-800">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !email || !password}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 text-white font-semibold text-xs hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? <LoadingSpinner size="sm" /> : <LogIn className="w-4 h-4" aria-hidden="true" />}
            <span>{submitting ? 'Signing in...' : 'Sign in'}</span>
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={onContinueBrowsing}
            className="text-xs text-stone-500 hover:text-stone-900 font-medium"
          >
            Continue browsing without signing in
          </button>
        </div>
      </div>
    </div>
  );
};
