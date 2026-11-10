import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Home } from 'lucide-react';
import WatchlistButton from './WatchlistButton';
import { getMyWatchlist } from '../../utils/watchlistApi';
import './WatchlistPanel.css';

function WatchlistPanel() {
  const [properties, setProperties] = useState([]);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setStatus('loading');
    setErrorMessage('');

    getMyWatchlist()
      .then((listings) => {
        if (isMounted) {
          setProperties(listings);
          setStatus('ready');
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message || 'Could not load your watchlist.');
          setStatus('error');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const removeProperty = (propertyId, watched) => {
    if (!watched) {
      setProperties((current) => current.filter((property) => String(property._id) !== String(propertyId)));
    }
  };

  return (
    <section className="watchlist-panel" id="watchlist" aria-labelledby="watchlist-title">
      <div className="watchlist-panel-heading">
        <div>
          <span className="watchlist-eyebrow">YOUR SAVED HOMES</span>
          <h2 id="watchlist-title">Watchlist <span>{status === 'ready' ? properties.length : ''}</span></h2>
        </div>
        <Link to="/#homes">Browse homes <ArrowRight aria-hidden="true" /></Link>
      </div>

      {status === 'loading' && <p className="watchlist-panel-state" role="status">Loading your watchlist…</p>}
      {status === 'error' && (
        <div className="watchlist-panel-state" role="alert">
          <p>{errorMessage}</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>
        </div>
      )}
      {status === 'ready' && properties.length === 0 && (
        <p className="watchlist-panel-state">No saved homes yet. Tap the heart on a listing to keep it here.</p>
      )}
      {status === 'ready' && properties.length > 0 && (
        <div className="watchlist-grid">
          {properties.map((property) => {
            const propertyId = property._id || property.id;
            return (
              <article className="watchlist-card" key={propertyId}>
                <Link className="watchlist-card-link" to={`/properties/${propertyId}`}>
                  {property.images?.[0] ? (
                    <img src={property.images[0]} alt="" loading="lazy" />
                  ) : (
                    <span className="watchlist-card-placeholder" aria-hidden="true"><Home /></span>
                  )}
                  <span className="watchlist-card-copy">
                    <strong>{property.title}</strong>
                    <span>{property.location}, {property.city}</span>
                    <span className="watchlist-card-price">৳ {Number(property.monthly_rent).toLocaleString()} / month</span>
                  </span>
                </Link>
                <WatchlistButton
                  propertyId={propertyId}
                  watched
                  showRemoveLabel
                  onChange={(watched) => removeProperty(propertyId, watched)}
                />
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default WatchlistPanel;
