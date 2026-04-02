import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { login, saveSession } from '../api/client';
import type { AuthSession, LoginPayload } from '../types';

interface LoginCardProps {
  onSuccess: (session: AuthSession) => void;
}

export function LoginCard({ onSuccess }: LoginCardProps) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<LoginPayload>({
    defaultValues: {
      username: 'admin',
      password: 'Admin123!'
    }
  });
  const [error, setError] = useState('');

  const onSubmit = async (payload: LoginPayload) => {
    setError('');

    try {
      const result = await login(payload);
      const session: AuthSession = {
        token: result.token,
        user: result.user
      };
      saveSession(session);
      onSuccess(session);
    } catch (submissionError) {
      setError('Login gagal. Periksa username dan password.');
    }
  };

  return (
    <section className="auth-shell">
      <div className="auth-glow auth-glow-left" />
      <div className="auth-glow auth-glow-right" />
      <div className="auth-card glass-card">
        <div className="brand-badge">TS</div>
        <p className="eyebrow">Timesheet Management System</p>
        <h1>Track workdays, export clean Excel files, and keep approval flow simple.</h1>
        <p className="lead">
          Starter UI untuk admin dan user dengan format timesheet yang bisa langsung disambungkan ke backend Express + Prisma.
        </p>

        <div className="credential-hint">
          <span>Seed credentials</span>
          <strong>admin / Admin123!</strong>
          <strong>jonathan.zefanya / User123!</strong>
        </div>

        <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
          <label>
            Username
            <input type="text" placeholder="admin" {...register('username', { required: true })} />
          </label>

          <label>
            Password
            <input type="password" placeholder="••••••••" {...register('password', { required: true })} />
          </label>

          {error ? <div className="form-error">{error}</div> : null}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </section>
  );
}
