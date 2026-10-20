import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { getMyProperties } from '../utils/propertyApi';

function OwnerDashboard() {
  const { profile } = useOutletContext();
  const firstName = profile.fullName.trim().split(/\s+/)[0];
  const [properties, setProperties] = useState([]);
  const [loadStatus, setLoadStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setLoadStatus('loading');

    getMyProperties()
      .then((listings) => {
        if (isMounted) {
          setProperties(listings);
          setLoadStatus('ready');
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message || 'Could not load your property listings.');
          setLoadStatus('error');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const availableCount = properties.filter((property) => property.status === 'Available').length;
  const bookedCount = properties.filter((property) => property.status === 'Booked').length;
  const activeCount = availableCount + bookedCount;
  const rentedCount = properties.filter((property) => property.status === 'Rented').length;
  const statValue = (count) => (loadStatus === 'ready' ? count : '—');
  const recentProperties = properties.slice(0, 4);

  return (
    <>
      <section className="owner-welcome">
        <div>
          <span className="owner-eyebrow">YOUR OWNER WORKSPACE</span>
          <h1>Welcome home, {firstName} <span aria-hidden="true">✦</span></h1>
          <p>Keep your property details and rental plans all in one place.</p>
        </div>
        <Link className="owner-button owner-button-primary" to="/owner/properties/new">
          <span aria-hidden="true">＋</span> Add a property
        </Link>
      </section>

      <section className="owner-stat-grid" aria-label="Property overview">
        <article className="owner-stat-card">
          <span className="owner-stat-icon owner-stat-icon-green" aria-hidden="true">⌂</span>
          <span className="owner-stat-label">My properties</span>
          <strong>{statValue(properties.length)}</strong>
          <span className="owner-stat-note">Across all listing statuses</span>
        </article>
        <article className="owner-stat-card">
          <span className="owner-stat-icon owner-stat-icon-blue" aria-hidden="true">◷</span>
          <span className="owner-stat-label">Active listings</span>
          <strong>{statValue(activeCount)}</strong>
          <span className="owner-stat-note">
            {loadStatus === 'ready'
              ? `${availableCount} available · ${bookedCount} booked`
              : loadStatus === 'loading' ? 'Loading status…' : 'Unavailable'}
          </span>
        </article>
        <article className="owner-stat-card">
          <span className="owner-stat-icon owner-stat-icon-amber" aria-hidden="true">✓</span>
          <span className="owner-stat-label">Rented</span>
          <strong>{statValue(rentedCount)}</strong>
          <span className="owner-stat-note">Marked as rented</span>
        </article>
      </section>

      <section className="owner-panel owner-properties-panel">
        <div className="owner-panel-heading">
          <div>
            <span className="owner-eyebrow">PORTFOLIO</span>
            <h2>Your properties <span className="owner-count">{loadStatus === 'ready' ? properties.length : '—'}</span></h2>
          </div>
          <Link className="owner-text-link" to="/owner/properties">View all <span aria-hidden="true">→</span></Link>
        </div>
        {loadStatus === 'loading' && <p className="owner-dashboard-state" role="status">Loading your listings…</p>}
        {loadStatus === 'error' && (
          <div className="owner-dashboard-state" role="alert">
            <p>{errorMessage}</p>
            <button className="owner-button owner-button-outline" type="button" onClick={() => setReloadKey((key) => key + 1)}>
              Try again
            </button>
          </div>
        )}
        {loadStatus === 'ready' && properties.length === 0 && (
          <div className="owner-empty-state">
            <span className="owner-empty-illustration" aria-hidden="true">
              <span className="owner-empty-sun" />
              <span className="owner-empty-home">⌂</span>
              <span className="owner-empty-ground" />
            </span>
            <h3>Your next great listing starts here</h3>
            <p>Add a property to keep its details organized and make it easier for renters to find.</p>
            <Link className="owner-button owner-button-outline" to="/owner/properties/new">List your first property</Link>
          </div>
        )}
        {loadStatus === 'ready' && recentProperties.length > 0 && (
          <div className="owner-recent-list">
            {recentProperties.map((property) => (
              <article className="owner-recent-item" key={property._id || property.id}>
                <div className="owner-recent-copy">
                  <strong>{property.title}</strong>
                  <span>{property.accommodation_type} · {property.location}, {property.city}</span>
                </div>
                <div className="owner-recent-meta">
                  <span className={`owner-listing-status owner-listing-status-${property.status.toLowerCase()}`}>{property.status}</span>
                  <strong>৳{Number(property.monthly_rent).toLocaleString()} / month</strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="owner-tip">
        <span className="owner-tip-icon" aria-hidden="true">✦</span>
        <div>
          <strong>A little detail goes a long way</strong>
          <p>Clear photos, accurate details, and a fair monthly rent help renters picture themselves at home.</p>
        </div>
        <Link to="/owner/properties/new" aria-label="Add a property">Get started <span aria-hidden="true">→</span></Link>
      </section>
    </>
  );
}

export default OwnerDashboard;