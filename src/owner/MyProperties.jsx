import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteProperty, getMyProperties } from '../utils/propertyApi';

function MyProperties() {
  const [properties, setProperties] = useState([]);
  const [loadStatus, setLoadStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setLoadStatus('loading');
    setErrorMessage('');

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

  const handleDelete = async (property) => {
    const propertyId = String(property._id || property.id);
    if (!window.confirm(`Delete "${property.title}"? This cannot be undone.`)) return;

    setDeletingId(propertyId);
    setErrorMessage('');
    try {
      await deleteProperty(propertyId);
      setProperties((current) => current.filter((item) => String(item._id || item.id) !== propertyId));
    } catch (error) {
      setErrorMessage(error.message || 'Could not delete this property. Please try again.');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <>
      <section className="owner-page-heading">
        <div>
          <span className="owner-eyebrow">YOUR PORTFOLIO</span>
          <h1>My properties</h1>
          <p>Keep track of the homes you’re preparing to share.</p>
        </div>
        <Link className="owner-button owner-button-primary" to="/owner/properties/new">
          <span aria-hidden="true">＋</span> Add a property
        </Link>
      </section>

      <section className="owner-panel owner-listings-panel">
        <div className="owner-panel-heading">
          <div>
            <span className="owner-eyebrow">ALL LISTINGS</span>
            <h2>Your property list <span className="owner-count">{loadStatus === 'ready' ? properties.length : '—'}</span></h2>
          </div>
        </div>
        {loadStatus === 'loading' && <p className="owner-dashboard-state" role="status">Loading your properties…</p>}
        {loadStatus === 'error' && (
          <div className="owner-dashboard-state" role="alert">
            <p>{errorMessage}</p>
            <button className="owner-button owner-button-outline" type="button" onClick={() => setReloadKey((key) => key + 1)}>
              Try again
            </button>
          </div>
        )}
        {errorMessage && loadStatus === 'ready' && <p className="owner-form-message" role="alert">{errorMessage}</p>}
        {loadStatus === 'ready' && properties.length === 0 && (
          <div className="owner-empty-state owner-empty-state-compact">
            <span className="owner-empty-illustration" aria-hidden="true">
              <span className="owner-empty-sun" />
              <span className="owner-empty-home">⌂</span>
              <span className="owner-empty-ground" />
            </span>
            <h3>No properties yet</h3>
            <p>When you add a home, it’ll show up here so you can keep everything in one place.</p>
            <Link className="owner-button owner-button-outline" to="/owner/properties/new">Add your first property</Link>
          </div>
        )}
        {loadStatus === 'ready' && properties.length > 0 && (
          <div className="owner-manage-list">
            {properties.map((property) => {
              const propertyId = String(property._id || property.id);
              return (
                <article className="owner-manage-item" key={propertyId}>
                  {property.images?.[0] && <img src={property.images[0]} alt="" />}
                  <div className="owner-manage-copy">
                    <strong>{property.title}</strong>
                    <span>{property.accommodation_type} · {property.location}, {property.city}</span>
                    <span>৳{Number(property.monthly_rent).toLocaleString()} / month</span>
                  </div>
                  <span className={`owner-listing-status owner-listing-status-${property.status.toLowerCase()}`}>
                    {property.status}
                  </span>
                  <div className="owner-manage-actions">
                    <Link className="owner-button owner-button-outline" to={`/owner/properties/${encodeURIComponent(propertyId)}/edit`}>
                      Edit
                    </Link>
                    <button
                      className="owner-button owner-button-outline owner-delete-button"
                      type="button"
                      disabled={deletingId === propertyId}
                      onClick={() => handleDelete(property)}
                    >
                      {deletingId === propertyId ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

export default MyProperties;
