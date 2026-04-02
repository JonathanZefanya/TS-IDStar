import { useEffect, useState } from 'react';
import {
  downloadMyTimesheet,
  fetchMyTimesheet,
  saveMyTimesheetEntries,
  submitMyTimesheet
} from '../api/client';
import { calculateTotalHours, currentPeriod, generateMonthRows } from '../lib/calendar';
import type { CalendarRow, TimesheetEntry, User } from '../types';

interface TimesheetEditorProps {
  user: User;
}

function toEntryPayload(rows: CalendarRow[]): TimesheetEntry[] {
  return rows.map((row) => ({
    date: row.date,
    dayName: row.dayName,
    startTime: row.startTime,
    lunchBreak: row.lunchBreak,
    endTime: row.endTime,
    totalHours: Number(row.totalHours || 0),
    activity: row.activity
  }));
}

function downloadBlob(blob: Blob, filename: string) {
  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

export function TimesheetEditor({ user }: TimesheetEditorProps) {
  const [period, setPeriod] = useState(currentPeriod());
  const [rows, setRows] = useState<CalendarRow[]>([]);
  const [holidayDates, setHolidayDates] = useState<string[]>([]);
  const [status, setStatus] = useState('draft');
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalHours, setTotalHours] = useState('0.00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTimesheet() {
      setLoading(true);
      setFeedback(null);

      try {
        const result = await fetchMyTimesheet(period);
        const nextRows = generateMonthRows(period, result.timesheet.entries, result.holidayDates);
        if (!isMounted) {
          return;
        }

        setRows(nextRows);
        setHolidayDates(result.holidayDates);
        setStatus(result.timesheet.status);
        setTotalEntries(result.summary.totalEntries);
        setTotalHours(result.summary.totalHours.toFixed(2));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setRows(generateMonthRows(period, []));
  setHolidayDates([]);
        setStatus('draft');
        setTotalEntries(0);
        setTotalHours('0.00');
        setFeedback({ kind: 'error', text: 'Gagal memuat timesheet. Silakan coba lagi.' });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadTimesheet();

    return () => {
      isMounted = false;
    };
  }, [period]);

  function updateRow(index: number, field: keyof CalendarRow, value: string) {
    setRows((currentRows) =>
      currentRows.map((row, rowIndex) => {
        if (rowIndex !== index || row.blocked) {
          return row;
        }

        const nextRow = {
          ...row,
          [field]: value
        } as CalendarRow;

        if (field === 'startTime' || field === 'lunchBreak' || field === 'endTime') {
          nextRow.totalHours = nextRow.startTime && nextRow.endTime ? calculateTotalHours(nextRow.startTime, nextRow.lunchBreak, nextRow.endTime) : '';
        }

        return nextRow;
      })
    );
  }

  async function persistRows() {
    const payload = toEntryPayload(rows);
    const result = await saveMyTimesheetEntries(period, payload, holidayDates);
    const nextRows = generateMonthRows(period, result.timesheet.entries, result.holidayDates);
    setRows(nextRows);
    setHolidayDates(result.holidayDates);
    setStatus(result.timesheet.status);
    setTotalEntries(result.timesheet.entries.length);
    setTotalHours(
      result.timesheet.entries.reduce((sum, entry) => sum + Number(entry.totalHours || 0), 0).toFixed(2)
    );
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(null);

    try {
      await persistRows();
      setFeedback({ kind: 'success', text: 'Timesheet berhasil disimpan.' });
    } catch (error) {
      setFeedback({ kind: 'error', text: 'Gagal menyimpan timesheet.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setFeedback(null);

    try {
      await persistRows();
      await submitMyTimesheet(period);
      setStatus('submitted');
      setFeedback({ kind: 'success', text: 'Timesheet berhasil dikirim untuk approval.' });
    } catch (error) {
      setFeedback({ kind: 'error', text: 'Gagal submit timesheet.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setFeedback(null);

    try {
      await persistRows();
      const response = await downloadMyTimesheet(period, holidayDates);
      downloadBlob(response.data as Blob, `timesheet-${user.username}-${period}.xlsx`);
      setFeedback({ kind: 'success', text: 'File Excel berhasil diunduh.' });
    } catch (error) {
      setFeedback({ kind: 'error', text: 'Gagal melakukan export Excel.' });
    } finally {
      setExporting(false);
    }
  }

  const rowTotalHours = rows.reduce((sum, row) => sum + Number(row.totalHours || 0), 0).toFixed(2);

  return (
    <section id="timesheet-editor" className="panel-card timesheet-card">
      <div className="panel-header">
        <div>
          <p className="section-label">User Workspace</p>
          <h2>Timesheet bulanan</h2>
        </div>
        <div className="status-pills">
          <span className={`status-pill status-${status}`}>{status}</span>
          <span className="status-pill neutral">{user.roleJob}</span>
        </div>
      </div>

      <div className="toolbar-grid">
        <label className="field-group">
          <span>Period</span>
          <input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} />
        </label>

        <div className="metric-card compact">
          <span>Rows</span>
          <strong>{rows.length}</strong>
        </div>

        <div className="metric-card compact">
          <span>Total Hours</span>
          <strong>{rowTotalHours}</strong>
        </div>

        <div className="metric-card compact">
          <span>Status</span>
          <strong>{status}</strong>
        </div>
      </div>

      {feedback ? <div className={`inline-banner ${feedback.kind}`}>{feedback.text}</div> : null}

      <div className="table-shell">
        <table className="timesheet-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Date</th>
              <th>Start time</th>
              <th>Lunch Break</th>
              <th>End Time</th>
              <th>Total Hours</th>
              <th>Activity / Remark</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="table-empty">
                  Loading timesheet...
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.date} className={row.blocked ? 'blocked-row' : ''}>
                  <td>
                    <div className="day-stack">
                      <strong>{row.dayName}</strong>
                      {row.blocked ? <span className="mini-tag">{row.blockedLabel || 'Blocked'}</span> : null}
                    </div>
                  </td>
                  <td>{row.date}</td>
                  <td>
                    <input
                      type="time"
                      value={row.startTime}
                      disabled={row.blocked}
                      onChange={(event) => updateRow(index, 'startTime', event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.lunchBreak}
                      disabled={row.blocked}
                      placeholder="01:00"
                      onChange={(event) => updateRow(index, 'lunchBreak', event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      value={row.endTime}
                      disabled={row.blocked}
                      onChange={(event) => updateRow(index, 'endTime', event.target.value)}
                    />
                  </td>
                  <td>
                    <input type="text" value={row.totalHours} readOnly />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.activity}
                      disabled={row.blocked}
                      placeholder={row.blocked ? row.dayName : 'Describe your work activity'}
                      onChange={(event) => updateRow(index, 'activity', event.target.value)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="action-row">
        <button className="secondary-button" onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Saving...' : 'Save draft'}
        </button>
        <button className="secondary-button" onClick={handleSubmit} disabled={submitting || loading}>
          {submitting ? 'Submitting...' : 'Submit timesheet'}
        </button>
        <button className="primary-button" onClick={handleExport} disabled={exporting || loading}>
          {exporting ? 'Exporting...' : 'Export Excel'}
        </button>
      </div>

      <div className="support-note">
        <div>
          <strong>Current seed user</strong>
          <span>{user.name} · {user.department} · {user.project}</span>
        </div>
        <p>
          Weekend dan hari libur dari master data dikunci otomatis. Activity pada hari libur akan mengikuti nama harinya.
        </p>
      </div>
    </section>
  );
}
