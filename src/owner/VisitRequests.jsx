import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOwnerVisitRequests, updateVisitRequest } from '../utils/visitRequestApi';

function formatVisitTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Invalid date'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function VisitRequests() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setStatus('loading');
    getOwnerVisitRequests()
      .then((items) => {
        if (isMounted) {
          setRequests(items);
          setStatus('ready');
          setErrorMessage('');
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message || 'Could not load visit requests.');
          setStatus('error');
        }
      });
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const handleDecision = async (requestId, decision) => {
    setUpdatingId(requestId);
    setErrorMessage('');
    try {
      const updated = await updateVisitRequest(requestId, decision);
      setRequests((current) => current.map((request) => (
        request._id === requestId ? { ...request, status: updated.status } : request
      )));
    } catch (error) {
      setErrorMessage(error.message || 'Could not update this visit request.');
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = requests.filter((request) => request.status === 'pending').length;

  return (
    <>
      <section className="owner-page-heading">
        <div>
          <span className="owner-eyebrow">PROPERTY VISITS</span>
          <h1>Visit requests</h1>
          <p>Review requested dates and times, then accept or reject each visit.</p>
        </div>
        {status === 'ready' && <span className="owner-count">{pendingCount} pending</span>}
      </section>

      {errorMessage && <p className="owner-request-error" role="alert">{errorMessage}</p>}
      {status === 'loading' && <p className="owner-dashboard-state" role="status">Loading visit requests…</p>}
      {status === 'error' && (
        <div className="owner-dashboard-state">
          <button className="owner-button owner-button-outline" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            Try again
          </button>
        </div>
      )}
      {status === 'ready' && requests.length === 0 && (
        <section className="owner-panel owner-requests-empty">
          <span className="owner-eyebrow">NO VISIT REQUESTS YET</span>
          <h2>When tenants request a visit, you’ll see it here.</h2>
          <p>Each request includes the property and the date and time they selected.</p>
        </section>
      )}
      {status === 'ready' && requests.length > 0 && (
        <section className="owner-panel owner-request-list" aria-label="Visit requests">
          {requests.map((request) => (
            <article className="owner-request-item" key={request._id}>
              <div className="owner-request-person">
                <strong>{request.requesterName}</strong>
                <a href={`mailto:${request.requesterEmail}`}>{request.requesterEmail}</a>
                <time dateTime={request.createdAt}>Requested {new Date(request.createdAt).toLocaleString()}</time>
              </div>
              <div className="owner-request-property">
                <span className="owner-eyebrow">PROPERTY VISIT</span>
                <Link to={`/properties/${request.property._id}`}>{request.property.title}</Link>
                <span>{request.property.location}, {request.property.city}</span>
                <time dateTime={request.visitAt}>Requested for {formatVisitTime(request.visitAt)}</time>
              </div>
              <div className="owner-request-actions">
                <span className={`owner-listing-status owner-listing-status-${request.status}`}>
                  {request.status}
                </span>
                {request.status === 'pending' && (
                  <>
                    <button
                      className="owner-button owner-button-primary"
                      type="button"
                      disabled={updatingId === request._id}
                      onClick={() => handleDecision(request._id, 'accepted')}
                    >
                      {updatingId === request._id ? 'Updating…' : 'Accept'}
                    </button>
                    <button
                      className="owner-button owner-button-outline"
                      type="button"
                      disabled={updatingId === request._id}
                      onClick={() => handleDecision(request._id, 'rejected')}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}

export default VisitRequests;
