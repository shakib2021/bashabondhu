import { useEffect, useMemo, useState } from 'react';
import { getAdminReports, updateAdminReport } from '../utils/adminApi';

function AdminReports() {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [busyReportId, setBusyReportId] = useState('');

  useEffect(() => {
    let isMounted = true;
    getAdminReports()
      .then((result) => {
        if (isMounted) {
          setReports(result);
          setStatus('ready');
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message || 'Could not load property reports.');
          setStatus('error');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredReports = useMemo(
    () => reports.filter((report) => filter === 'all' || report.status === filter),
    [reports, filter],
  );

  const handleReview = async (report, nextStatus) => {
    setBusyReportId(report.id);
    setErrorMessage('');
    try {
      await updateAdminReport(report.id, nextStatus);
      setReports((items) => items.map((item) => (
        item.id === report.id ? { ...item, status: nextStatus } : item
      )));
    } catch (error) {
      setErrorMessage(error.message || 'Could not update this report.');
    } finally {
      setBusyReportId('');
    }
  };

  return (
    <>
      <section className="admin-page-heading">
        <span className="admin-page-eyebrow">SAFETY & MODERATION</span>
        <h1>Property reports</h1>
        <p>Review reports submitted about property listings and record the outcome.</p>
      </section>
      <div className="admin-toolbar">
        <span className="admin-table-secondary">{status === 'ready' ? `${filteredReports.length} reports` : ''}</span>
        <select className="admin-filter" value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter reports">
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="dismissed">Dismissed</option>
          <option value="all">All reports</option>
        </select>
      </div>
      {errorMessage && <p className="admin-page-error" role="alert">{errorMessage}</p>}
      {status === 'loading' && <p className="admin-page-state" role="status">Loading reports…</p>}
      {status === 'error' && <section className="admin-page-state">Reports could not be loaded.</section>}
      {status === 'ready' && (
        filteredReports.length ? (
          <div className="admin-report-list">
            {filteredReports.map((report) => (
              <article className="admin-report-card" key={report.id}>
                <header>
                  <div>
                    <h2>{report.propertyTitle || 'Property report'}</h2>
                    <span className="admin-table-secondary">
                      {report.category.replace(/-/g, ' ')} · {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'Date unavailable'}
                    </span>
                  </div>
                  <span className={`admin-status-pill is-${report.status}`}>{report.status}</span>
                </header>
                <p>{report.details || 'No additional details were provided.'}</p>
                <div className="admin-report-actions">
                  <a className="admin-inline-action" href={`/properties/${encodeURIComponent(report.propertyId)}`} target="_blank" rel="noreferrer">
                    View listing
                  </a>
                  {report.status === 'pending' && (
                    <>
                      <button
                        className="admin-inline-action"
                        type="button"
                        disabled={busyReportId === report.id}
                        onClick={() => handleReview(report, 'reviewed')}
                      >
                        Mark reviewed
                      </button>
                      <button
                        className="admin-inline-action is-danger"
                        type="button"
                        disabled={busyReportId === report.id}
                        onClick={() => handleReview(report, 'dismissed')}
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className="admin-page-state">There are no {filter === 'all' ? '' : `${filter} `}reports.</section>
        )
      )}
    </>
  );
}

export default AdminReports;
