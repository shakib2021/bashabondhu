import { Link, useOutletContext } from 'react-router-dom';

function OwnerDashboard() {
  const { profile } = useOutletContext();
  const firstName = profile.fullName.trim().split(/\s+/)[0];

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
          <strong>0</strong>
          <span className="owner-stat-note">Your portfolio starts here</span>
        </article>
        <article className="owner-stat-card">
          <span className="owner-stat-icon owner-stat-icon-blue" aria-hidden="true">◷</span>
          <span className="owner-stat-label">Active listings</span>
          <strong>0</strong>
          <span className="owner-stat-note">Ready when you are</span>
        </article>
        <article className="owner-stat-card">
          <span className="owner-stat-icon owner-stat-icon-amber" aria-hidden="true">♡</span>
          <span className="owner-stat-label">New inquiries</span>
          <strong>0</strong>
          <span className="owner-stat-note">No inquiries yet</span>
        </article>
      </section>

      <section className="owner-panel owner-properties-panel">
        <div className="owner-panel-heading">
          <div>
            <span className="owner-eyebrow">PORTFOLIO</span>
            <h2>Your properties</h2>
          </div>
          <Link className="owner-text-link" to="/owner/properties">View all <span aria-hidden="true">→</span></Link>
        </div>
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