import { useEffect, useState } from 'react';
import { clearSession, fetchMe, readSession, saveSession } from './api/client';
import { AdminPanel } from './components/AdminPanel';
import { LoginCard } from './components/LoginCard';
import { TimesheetEditor } from './components/TimesheetEditor';
import type { AuthSession } from './types';

function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    async function bootstrapSession() {
      const storedSession = readSession();

      if (!storedSession) {
        setBooting(false);
        return;
      }

      try {
        const result = await fetchMe();
        const refreshedSession = {
          ...storedSession,
          user: result.user
        };

        saveSession(refreshedSession);
        setSession(refreshedSession);
      } catch (error) {
        clearSession();
        setSession(null);
      } finally {
        setBooting(false);
      }
    }

    bootstrapSession();
  }, []);

  function handleLogin(nextSession: AuthSession) {
    setSession(nextSession);
  }

  function handleLogout() {
    clearSession();
    setSession(null);
  }

  function handleUserUpdate(nextUser: AuthSession['user']) {
    if (!session) {
      return;
    }

    const nextSession = {
      ...session,
      user: nextUser
    };
    saveSession(nextSession);
    setSession(nextSession);
  }

  if (booting) {
    return (
      <div className="boot-screen">
        <div className="boot-card glass-card">
          <div className="spinner" />
          <p>Preparing Timesheet Management System...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginCard onSuccess={handleLogin} />;
  }

  const isAdmin = session.user.roleSystem === 'admin';

  return (
    <div className="dashboard-shell">
      <aside className="side-rail glass-card">
        <div>
          <div className="brand-badge large">TS</div>
          <p className="eyebrow">PT. IDSTAR CIPTA TEKNOLOGI</p>
          <h1>{isAdmin ? 'Admin Control Center' : 'Timesheet Command Center'}</h1>
          <p className="rail-copy">
            {isAdmin
              ? 'Kelola data user dan file timesheet yang sudah di-submit.'
              : 'Satu tempat untuk input timesheet, ekspor Excel, dan monitoring file yang sudah dikirim.'}
          </p>
        </div>

        <div className="user-chip">
          <span>{session.user.name}</span>
          <strong>{session.user.roleSystem}</strong>
        </div>

        <div className="rail-meta">
          <div>
            <span>Department</span>
            <strong>{session.user.department}</strong>
          </div>
          <div>
            <span>Project</span>
            <strong>{session.user.project}</strong>
          </div>
          <div>
            <span>Team Lead</span>
            <strong>{session.user.teamLeadName}</strong>
          </div>
        </div>

        <button className="secondary-button full-width" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="workspace-stack">
        <section className="hero-banner glass-card">
          <div className="hero-copy">
            <p className="eyebrow">Welcome back</p>
            <h2>
              {session.user.roleSystem === 'admin'
                ? 'Monitor employee activity and submitted files.'
                : 'Fill your daily activity log and export monthly Excel files.'}
            </h2>
            <p>
              {isAdmin
                ? 'Mode admin menampilkan area manajemen user dan daftar file timesheet untuk review/export.'
                : 'Isi timesheet harian, simpan draft, lalu export Excel bulanan sesuai template.'}
            </p>
          </div>

          <div className="hero-stats">
            <div className="metric-card">
              <span>Name</span>
              <strong>{session.user.name}</strong>
            </div>
            <div className="metric-card">
              <span>Role</span>
              <strong>{session.user.roleJob}</strong>
            </div>
            <div className="metric-card">
              <span>Location</span>
              <strong>{session.user.location}</strong>
            </div>
          </div>
        </section>

        {isAdmin ? <AdminPanel user={session.user} /> : <TimesheetEditor user={session.user} onUserUpdate={handleUserUpdate} />}

        {!isAdmin ? (
          <section className="panel-card help-card">
            <div>
              <p className="section-label">Workflow</p>
              <h2>How the flow works</h2>
            </div>
            <ol>
              <li>Input start time, lunch break duration, end time, and daily activity.</li>
              <li>Save draft or submit the timesheet for approval.</li>
              <li>Use Export Excel to download the monthly .xlsx file in the strict template format.</li>
            </ol>
          </section>
        ) : null}
      </main>
    </div>
  );
}

export default App;
