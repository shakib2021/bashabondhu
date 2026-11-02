import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminSummary } from '../utils/adminApi';

function AdminOverview() {
  const [summary, setSummary] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setErrorMessage('');
    getAdminSummary()
      .then((result) => {
        if (isMounted) setSummary(result);
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(error.message || 'Could not load admin statistics.');
      });

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const metrics = [
    { label: 'Registered users', value: summary?.users, note: 'Owners and tenants', to: '/admin/users' },
    { label: 'Property posts', value: summary?.posts, note: 'All listings', to: '/admin/posts' },
    { label: 'Pending verifications', value: summary?.pendingVerifications, note: 'Owner NID reviews', to: '/admin/verifications' },
    { label: 'Pending reports', value: summary?.pendingReports, note: 'Reported listings', to: '/admin/reports' },
  ];

  return (
    <>
      <section className="admin-page-heading">
        <span className="admin-page-eyebrow">ADMIN WORKSPACE</span>
        <h1>Dashboard overview</h1>
        <p>Manage BashaBondhu listings, members, and review queues.</p>
      </section>
      {errorMessage ? (
        <section className="admin-page-state admin-page-error" role="alert">
          <p>{errorMessage}</p>
          <button className="admin-inline-action" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            Try again
          </button>
        </section>
      ) : (
        <section className="admin-metric-grid" aria-label="Platform overview">
          {metrics.map((metric) => (
            <Link className="admin-metric-card" to={metric.to} key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value ?? '—'}</strong>
              <small>{metric.note}</small>
            </Link>
          ))}
        </section>
      )}
      <section className="admin-action-grid" aria-label="Admin tools">
        <Link className="admin-action-card" to="/admin/verifications">
          <span aria-hidden="true">✓</span>
          <div><strong>Review owner identities</strong><p>Check submitted NID details and approve or reject verification requests.</p></div>
        </Link>
        <Link className="admin-action-card" to="/admin/posts">
          <span aria-hidden="true">▤</span>
          <div><strong>Manage property posts</strong><p>Review published listings and remove posts that violate platform rules.</p></div>
        </Link>
        <Link className="admin-action-card" to="/admin/users">
          <span aria-hidden="true">♙</span>
          <div><strong>Manage accounts</strong><p>Search members and suspend or reactivate user accounts.</p></div>
        </Link>
        <Link className="admin-action-card" to="/admin/reports">
          <span aria-hidden="true">⚑</span>
          <div><strong>Review reports</strong><p>Follow up on reports submitted by tenants and owners.</p></div>
        </Link>
      </section>
    </>
  );
}

export default AdminOverview;
