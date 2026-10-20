import { Link } from 'react-router-dom';

function MyProperties() {
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
            <h2>Your property list <span className="owner-count">0</span></h2>
          </div>
          <span className="owner-listing-filter">All properties <span aria-hidden="true">⌄</span></span>
        </div>
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
      </section>
    </>
  );
}

export default MyProperties;