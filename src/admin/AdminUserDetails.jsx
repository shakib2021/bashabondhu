import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAdminUserDetails } from '../utils/adminApi';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function AdminUserDetails() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    setStatus('loading');
    getAdminUserDetails(userId)
      .then((result) => {
        if (isMounted) {
          setUser(result);
          setStatus('ready');
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message || 'Could not load this user’s private details.');
          setStatus('error');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return (
    <>
      <Link className="admin-detail-back" to="/admin/users">← Back to users</Link>
      {status === 'loading' && <p className="admin-page-state" role="status">Loading private user details…</p>}
      {status === 'error' && <p className="admin-page-error" role="alert">{errorMessage}</p>}
      {status === 'ready' && user && (
        <>
          <section className="admin-page-heading">
            <span className="admin-page-eyebrow">PRIVATE ACCOUNT DETAILS</span>
            <h1>{user.fullName || 'User'}</h1>
            <p>{user.email}</p>
            {user.profileImage && <img className="admin-user-profile-image" src={user.profileImage} alt="" />}
          </section>

          <section className="admin-detail-card" aria-labelledby="account-details-heading">
            <h2 id="account-details-heading">Account details</h2>
            <dl className="admin-detail-grid">
              <div><dt>Email</dt><dd>{user.email || '—'}</dd></div>
              <div><dt>Phone</dt><dd>{user.phone || '—'}</dd></div>
              <div><dt>Address</dt><dd>{user.address || '—'}</dd></div>
              <div><dt>Occupation</dt><dd>{user.occupation || '—'}</dd></div>
              <div><dt>Role</dt><dd>{user.role || '—'}</dd></div>
              <div><dt>Account status</dt><dd>{user.accountStatus || '—'}</dd></div>
              <div><dt>Authentication provider</dt><dd>{user.authProvider || '—'}</dd></div>
              <div><dt>Owner verification</dt><dd>{user.role === 'owner' ? user.ownerVerificationStatus : 'Not applicable'}</dd></div>
              <div><dt>Joined</dt><dd>{formatDate(user.createdAt)}</dd></div>
              <div><dt>Last profile update</dt><dd>{formatDate(user.updatedAt)}</dd></div>
            </dl>
          </section>

          <section className="admin-detail-card" aria-labelledby="warnings-heading">
            <h2 id="warnings-heading">Warnings ({Math.max(user.warningCount || 0, user.warnings.length)})</h2>
            {user.warnings.length ? (
              <ul className="admin-warning-history">
                {user.warnings.map((warning) => (
                  <li key={warning.id}>
                    <p>{warning.reason}</p>
                    <time dateTime={warning.createdAt}>{formatDate(warning.createdAt)}</time>
                  </li>
                ))}
              </ul>
            ) : <p className="admin-detail-empty">No warnings have been issued.</p>}
          </section>

          <section className="admin-detail-card" aria-labelledby="properties-heading">
            <h2 id="properties-heading">Property posts ({user.properties.length})</h2>
            {user.properties.length ? (
              <div className="admin-user-post-list">
                {user.properties.map((property) => (
                  <article className="admin-user-post" key={property.id}>
                    <div>
                      <h3>{property.title}</h3>
                      <p>{[property.accommodationType, property.location, property.city].filter(Boolean).join(' · ')}</p>
                      <p>{property.description || 'No description provided.'}</p>
                      {property.address && <p>Address: {property.address}</p>}
                      <small>
                        ৳{Number(property.monthlyRent || 0).toLocaleString()} / month · {property.rooms || 0} rooms
                        {' · '}{property.bedrooms || 0} bedrooms · {property.bathrooms || 0} bathrooms
                        {' · '}{property.status}
                      </small>
                      {property.facilities.length > 0 && <small>Facilities: {property.facilities.join(', ')}</small>}
                    </div>
                    <span className={`admin-status-pill is-${(property.moderationStatus || 'approved').toLowerCase()}`}>
                      {property.moderationStatus || 'approved'}
                    </span>
                  </article>
                ))}
              </div>
            ) : <p className="admin-detail-empty">This user has no property posts.</p>}
          </section>

          <section className="admin-detail-card" aria-labelledby="marketplace-heading">
            <h2 id="marketplace-heading">Marketplace posts ({user.marketplacePosts.length})</h2>
            {user.marketplacePosts.length ? (
              <div className="admin-user-post-list">
                {user.marketplacePosts.map((post) => (
                  <article className="admin-user-post" key={post.id}>
                    <div>
                      <h3>{post.title}</h3>
                      <p>{post.location} · {post.condition}</p>
                      <p>{post.description || 'No description provided.'}</p>
                      <small>৳{Number(post.price || 0).toLocaleString()} · {post.status} · Posted {formatDate(post.createdAt)}</small>
                    </div>
                    <span className={`admin-status-pill is-${(post.moderationStatus || 'approved').toLowerCase()}`}>
                      {post.moderationStatus || 'approved'}
                    </span>
                  </article>
                ))}
              </div>
            ) : <p className="admin-detail-empty">This user has no marketplace posts.</p>}
          </section>
        </>
      )}
    </>
  );
}

export default AdminUserDetails;
