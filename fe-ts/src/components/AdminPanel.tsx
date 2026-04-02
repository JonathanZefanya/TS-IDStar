import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  createAdminUser,
  deleteAdminTimesheet,
  deleteAdminUser,
  downloadAdminTimesheet,
  fetchAdminTimesheets,
  fetchAdminUsers,
  updateAdminUser
} from '../api/client';
import type { Timesheet, User } from '../types';

interface AdminPanelProps {
  user: User;
}

type AdminTab = 'users' | 'files';
type FeedbackState = { kind: 'success' | 'error'; text: string } | null;

interface UserDraft {
  id?: number;
  name: string;
  roleSystem: 'admin' | 'user';
  roleJob: string;
  department: string;
  location: string;
  project: string;
  teamLeadName: string;
  deptHeadName: string;
  username: string;
  password: string;
}

function createUserDraft(value?: User): UserDraft {
  return {
    id: value?.id,
    name: value?.name || '',
    roleSystem: (value?.roleSystem as 'admin' | 'user') || 'user',
    roleJob: value?.roleJob || '',
    department: value?.department || '',
    location: value?.location || '',
    project: value?.project || '',
    teamLeadName: value?.teamLeadName || '',
    deptHeadName: value?.deptHeadName || '',
    username: value?.username || '',
    password: ''
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export function AdminPanel({ user }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [fileQuery, setFileQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'submitted' | 'approved'>('all');
  const [userDraft, setUserDraft] = useState<UserDraft>(createUserDraft());
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [loading, setLoading] = useState(true);
  const [savingUser, setSavingUser] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      setFeedback(null);

      try {
        const [usersResult, timesheetsResult] = await Promise.all([fetchAdminUsers(), fetchAdminTimesheets()]);
        if (!mounted) {
          return;
        }

        setUsers(usersResult.users);
        setTimesheets(timesheetsResult.timesheets);
      } catch (error) {
        if (!mounted) {
          return;
        }
        setFeedback({ kind: 'error', text: 'Gagal memuat data admin.' });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  async function refreshUsers() {
    const result = await fetchAdminUsers();
    setUsers(result.users);
    return result.users;
  }

  async function refreshFiles() {
    const result = await fetchAdminTimesheets();
    setTimesheets(result.timesheets);
    return result.timesheets;
  }

  function openCreateUserModal() {
    setUserDraft(createUserDraft());
    setIsUserModalOpen(true);
  }

  function openEditUserModal(item: User) {
    setUserDraft(createUserDraft(item));
    setIsUserModalOpen(true);
  }

  function closeUserModal() {
    if (savingUser) {
      return;
    }

    setIsUserModalOpen(false);
    setUserDraft(createUserDraft());
  }

  async function handleSaveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingUser(true);
    setFeedback(null);

    try {
      const payload = {
        name: userDraft.name,
        roleSystem: userDraft.roleSystem,
        roleJob: userDraft.roleJob,
        department: userDraft.department,
        location: userDraft.location,
        project: userDraft.project,
        teamLeadName: userDraft.teamLeadName,
        deptHeadName: userDraft.deptHeadName,
        username: userDraft.username,
        password: userDraft.password
      };

      if (userDraft.id) {
        await updateAdminUser(userDraft.id, payload);
      } else {
        if (!payload.password) {
          throw new Error('Password wajib diisi untuk user baru.');
        }
        await createAdminUser(payload);
      }

      await refreshUsers();
      await refreshFiles();
      setFeedback({ kind: 'success', text: userDraft.id ? 'User berhasil diperbarui.' : 'User berhasil ditambahkan.' });
      setIsUserModalOpen(false);
      setUserDraft(createUserDraft());
    } catch (error) {
      setFeedback({ kind: 'error', text: 'Gagal menyimpan user.' });
    } finally {
      setSavingUser(false);
    }
  }

  async function handleDeleteUser(id: number) {
    if (!window.confirm('Hapus user ini? Timesheet terkait juga akan ikut terhapus.')) {
      return;
    }

    try {
      await deleteAdminUser(id);
      await refreshUsers();
      await refreshFiles();
      setFeedback({ kind: 'success', text: 'User berhasil dihapus.' });
      if (userDraft.id === id) {
        setIsUserModalOpen(false);
        setUserDraft(createUserDraft());
      }
    } catch (error) {
      setFeedback({ kind: 'error', text: 'Gagal menghapus user.' });
    }
  }

  async function handleExportFile(item: Timesheet) {
    try {
      const response = await downloadAdminTimesheet(item.id);
      const filename = `timesheet-${item.user?.username || item.id}-${item.period}.xlsx`;
      downloadBlob(response.data as Blob, filename);
      setFeedback({ kind: 'success', text: `File ${item.period} berhasil diunduh.` });
    } catch (error) {
      setFeedback({ kind: 'error', text: 'Gagal export file timesheet.' });
    }
  }

  async function handleDeleteFile(id: number) {
    if (!window.confirm('Hapus file timesheet ini?')) {
      return;
    }

    try {
      await deleteAdminTimesheet(id);
      await refreshFiles();
      setFeedback({ kind: 'success', text: 'File timesheet berhasil dihapus.' });
    } catch (error) {
      setFeedback({ kind: 'error', text: 'Gagal menghapus file timesheet.' });
    }
  }

  const fileSummary = useMemo(() => {
    return timesheets.reduce(
      (result, item) => {
        result.totalFiles += 1;
        result.totalEntries += item.entries?.length || 0;
        result.totalHours += Number(item.summary?.totalHours || 0);
        if (item.status === 'approved') {
          result.approved += 1;
        } else if (item.status === 'submitted') {
          result.submitted += 1;
        } else {
          result.draft += 1;
        }
        return result;
      },
      { totalFiles: 0, totalEntries: 0, totalHours: 0, draft: 0, submitted: 0, approved: 0 }
    );
  }, [timesheets]);

  const chartItems = useMemo(() => {
    return [
      { label: 'Users', value: users.length, className: 'users' },
      { label: 'Files', value: fileSummary.totalFiles, className: 'files' }
    ];
  }, [fileSummary.totalFiles, users.length]);

  const maxChartValue = useMemo(() => {
    return Math.max(1, ...chartItems.map((item) => item.value));
  }, [chartItems]);

  const filteredUsers = useMemo(() => {
    const keyword = userQuery.trim().toLowerCase();
    if (!keyword) {
      return users;
    }

    return users.filter((item) => {
      return [item.name, item.username, item.department, item.roleJob, item.project]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword));
    });
  }, [users, userQuery]);

  const filteredFiles = useMemo(() => {
    const keyword = fileQuery.trim().toLowerCase();

    return timesheets.filter((item) => {
      const byStatus = statusFilter === 'all' || item.status === statusFilter;
      if (!byStatus) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const haystack = [item.user?.name || '', item.user?.username || '', item.period, item.status].join(' ').toLowerCase();
      return haystack.includes(keyword);
    });
  }, [fileQuery, statusFilter, timesheets]);

  return (
    <section id="admin-panel" className="panel-card admin-card">
      <div className="panel-header">
        <div>
          <p className="section-label">Admin Dashboard</p>
          <h2>Manajemen User dan File Timesheet</h2>
        </div>
        <div className="status-pills">
          <span className="status-pill neutral">{user.name}</span>
          <span className="status-pill neutral">{users.length} users</span>
          <span className="status-pill neutral">{fileSummary.totalFiles} files</span>
        </div>
      </div>

      {feedback ? <div className={`inline-banner ${feedback.kind}`}>{feedback.text}</div> : null}
      {loading ? <div className="inline-banner info">Loading admin data...</div> : null}

      <section className="overview-chart">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Grafik Jumlah Data</h3>
            <span>Users vs Files</span>
          </div>
          <div className="bar-chart-list">
            {chartItems.map((item) => {
              const width = Math.max(8, Math.round((item.value / maxChartValue) * 100));
              return (
                <div className="bar-chart-row" key={item.label}>
                  <span className="bar-label">{item.label}</span>
                  <div className="bar-track">
                    <div className={`bar-fill ${item.className}`} style={{ width: `${width}%` }} />
                  </div>
                  <strong className="bar-value">{item.value}</strong>
                </div>
              );
            })}
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Status File</h3>
            <span>Distribusi proses</span>
          </div>
          <div className="status-mini-grid">
            <div className="metric-card compact">
              <span>Draft</span>
              <strong>{fileSummary.draft}</strong>
            </div>
            <div className="metric-card compact">
              <span>Submitted</span>
              <strong>{fileSummary.submitted}</strong>
            </div>
            <div className="metric-card compact">
              <span>Approved</span>
              <strong>{fileSummary.approved}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="admin-tabs">
        <button className={`tab-button ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')} type="button">
          User Management
        </button>
        <button className={`tab-button ${activeTab === 'files' ? 'active' : ''}`} onClick={() => setActiveTab('files')} type="button">
          File Management
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="admin-tab-stack">
          <div className="table-card users-table-card">
            <div className="table-card-header">
              <h3>Daftar User</h3>
              <span>{filteredUsers.length} / {users.length} records</span>
            </div>

            <div className="table-controls table-controls-inline">
              <input
                className="search-input"
                placeholder="Cari nama, username, department, role..."
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
              />
              <button type="button" className="primary-button" onClick={openCreateUserModal}>
                Tambah User
              </button>
            </div>

            <div className="table-shell compact-shell">
              <table className="timesheet-table admin-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.username}</td>
                      <td>{item.roleSystem}</td>
                      <td>{item.department}</td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="link-button" onClick={() => openEditUserModal(item)}>
                            Edit
                          </button>
                          <button type="button" className="link-button danger" onClick={() => handleDeleteUser(item.id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredUsers.length ? (
                    <tr>
                      <td className="table-empty" colSpan={5}>
                        Tidak ada user yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'files' ? (
        <div className="admin-tab-stack">
          <div className="toolbar-row">
            <div className="metric-card compact">
              <span>Total Files</span>
              <strong>{fileSummary.totalFiles}</strong>
            </div>
            <div className="metric-card compact">
              <span>Total Entries</span>
              <strong>{fileSummary.totalEntries}</strong>
            </div>
            <div className="metric-card compact">
              <span>Total Hours</span>
              <strong>{fileSummary.totalHours.toFixed(2)}</strong>
            </div>
          </div>

          <div className="table-card">
            <div className="table-card-header">
              <h3>Daftar File Timesheet</h3>
              <span>{filteredFiles.length} / {timesheets.length} files</span>
            </div>

            <div className="table-controls table-controls-inline">
              <input
                className="search-input"
                placeholder="Cari employee, period, atau status..."
                value={fileQuery}
                onChange={(event) => setFileQuery(event.target.value)}
              />
              <select className="select-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | 'draft' | 'submitted' | 'approved')}>
                <option value="all">Semua status</option>
                <option value="draft">draft</option>
                <option value="submitted">submitted</option>
                <option value="approved">approved</option>
              </select>
            </div>

            <div className="table-shell compact-shell">
              <table className="timesheet-table admin-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th>Entries</th>
                    <th>Total Hours</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((item) => (
                    <tr key={item.id}>
                      <td>{item.user?.name || '-'}</td>
                      <td>{item.period}</td>
                      <td>
                        <span className={`status-pill status-${item.status}`}>{item.status}</span>
                      </td>
                      <td>{item.entries?.length || 0}</td>
                      <td>{Number(item.summary?.totalHours || 0).toFixed(2)}</td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="link-button" onClick={() => handleExportFile(item)}>
                            Export
                          </button>
                          <button type="button" className="link-button danger" onClick={() => handleDeleteFile(item.id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredFiles.length ? (
                    <tr>
                      <td className="table-empty" colSpan={6}>
                        Tidak ada file timesheet yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {isUserModalOpen ? (
        <div className="modal-backdrop" onClick={closeUserModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="section-label">User Form</p>
                <h3>{userDraft.id ? 'Edit User' : 'Tambah User'}</h3>
              </div>
              <button type="button" className="modal-close" onClick={closeUserModal}>
                x
              </button>
            </div>

            <form className="modal-form" onSubmit={handleSaveUser}>
              <div className="modal-form-grid">
                <label className="field-group">
                  <span>Nama</span>
                  <input value={userDraft.name} onChange={(event) => setUserDraft((current) => ({ ...current, name: event.target.value }))} />
                </label>
                <label className="field-group">
                  <span>Role System</span>
                  <select value={userDraft.roleSystem} onChange={(event) => setUserDraft((current) => ({ ...current, roleSystem: event.target.value as 'admin' | 'user' }))}>
                    <option value="admin">admin</option>
                    <option value="user">user</option>
                  </select>
                </label>
                <label className="field-group">
                  <span>Role Job</span>
                  <input value={userDraft.roleJob} onChange={(event) => setUserDraft((current) => ({ ...current, roleJob: event.target.value }))} />
                </label>
                <label className="field-group">
                  <span>Department</span>
                  <input value={userDraft.department} onChange={(event) => setUserDraft((current) => ({ ...current, department: event.target.value }))} />
                </label>
                <label className="field-group">
                  <span>Location</span>
                  <input value={userDraft.location} onChange={(event) => setUserDraft((current) => ({ ...current, location: event.target.value }))} />
                </label>
                <label className="field-group">
                  <span>Project</span>
                  <input value={userDraft.project} onChange={(event) => setUserDraft((current) => ({ ...current, project: event.target.value }))} />
                </label>
                <label className="field-group">
                  <span>Team Lead</span>
                  <input value={userDraft.teamLeadName} onChange={(event) => setUserDraft((current) => ({ ...current, teamLeadName: event.target.value }))} />
                </label>
                <label className="field-group">
                  <span>Dept Head</span>
                  <input value={userDraft.deptHeadName} onChange={(event) => setUserDraft((current) => ({ ...current, deptHeadName: event.target.value }))} />
                </label>
                <label className="field-group">
                  <span>Username</span>
                  <input value={userDraft.username} onChange={(event) => setUserDraft((current) => ({ ...current, username: event.target.value }))} />
                </label>
                <label className="field-group">
                  <span>Password {userDraft.id ? '(opsional)' : ''}</span>
                  <input type="password" value={userDraft.password} onChange={(event) => setUserDraft((current) => ({ ...current, password: event.target.value }))} />
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeUserModal}>
                  Batal
                </button>
                <button type="submit" className="primary-button" disabled={savingUser}>
                  {savingUser ? 'Saving...' : userDraft.id ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
