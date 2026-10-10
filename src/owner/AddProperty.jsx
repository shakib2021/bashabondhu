import { Link } from 'react-router-dom';
import { useState } from 'react';

function AddProperty() {
  const [preview, setPreview] = useState(null);

  const handlePreview = (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setPreview({
      name: values.get('name'),
      propertyType: values.get('propertyType'),
      rent: values.get('rent'),
      address: values.get('address'),
      area: values.get('area'),
      city: values.get('city'),
    });
  };

  return (
    <>
      <section className="owner-page-heading">
        <div>
          <span className="owner-eyebrow">GROW YOUR PORTFOLIO</span>
          <h1>Add a property</h1>
          <p>Share the essentials to start putting your home on renters’ radar.</p>
        </div>
        <Link className="owner-back-link" to="/owner/properties"><span aria-hidden="true">←</span> Back to properties</Link>
      </section>

      <div className="owner-form-layout">
        <form className="owner-panel owner-property-form" onSubmit={handlePreview}>
          <div className="owner-panel-heading">
            <div>
              <span className="owner-eyebrow">PROPERTY DETAILS</span>
              <h2>Tell us about your place</h2>
            </div>
            <span className="owner-required-note"><span aria-hidden="true">*</span> Required</span>
          </div>

          <div className="owner-form-section">
            <h3><span>01</span> The basics</h3>
            <div className="owner-form-grid">
              <label className="owner-field owner-field-wide">
                <span>Property name <i>*</i></span>
                <input type="text" name="name" placeholder="e.g. Sunny apartment in Dhanmondi" required />
              </label>
              <label className="owner-field">
                <span>Property type <i>*</i></span>
                <select name="propertyType" defaultValue="" required>
                  <option value="" disabled>Select a type</option>
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="room">Room</option>
                  <option value="studio">Studio</option>
                </select>
              </label>
              <label className="owner-field">
                <span>Monthly rent (৳) <i>*</i></span>
                <input type="number" name="rent" min="0" placeholder="e.g. 25000" required />
              </label>
            </div>
          </div>

          <div className="owner-form-section">
            <h3><span>02</span> Location</h3>
            <div className="owner-form-grid">
              <label className="owner-field owner-field-wide">
                <span>Street address <i>*</i></span>
                <input type="text" name="address" placeholder="House, road, and area" required />
              </label>
              <label className="owner-field">
                <span>Area / neighborhood <i>*</i></span>
                <input type="text" name="area" placeholder="e.g. Dhanmondi" required />
              </label>
              <label className="owner-field">
                <span>City <i>*</i></span>
                <input type="text" name="city" placeholder="e.g. Dhaka" required />
              </label>
            </div>
          </div>

          <div className="owner-form-section">
            <h3><span>03</span> A few more details</h3>
            <div className="owner-form-grid owner-form-grid-three">
              <label className="owner-field">
                <span>Bedrooms</span>
                <select name="bedrooms" defaultValue="">
                  <option value="">Select</option>
                  <option value="1">1 bedroom</option>
                  <option value="2">2 bedrooms</option>
                  <option value="3">3 bedrooms</option>
                  <option value="4">4+ bedrooms</option>
                </select>
              </label>
              <label className="owner-field">
                <span>Bathrooms</span>
                <select name="bathrooms" defaultValue="">
                  <option value="">Select</option>
                  <option value="1">1 bathroom</option>
                  <option value="2">2 bathrooms</option>
                  <option value="3">3+ bathrooms</option>
                </select>
              </label>
              <label className="owner-field">
                <span>Available from</span>
                <input type="date" name="availableFrom" />
              </label>
              <label className="owner-field owner-field-wide">
                <span>About this property</span>
                <textarea name="description" rows="4" placeholder="What makes this home special? Include anything renters should know." />
              </label>
            </div>
          </div>

          <div className="owner-form-actions">
            <Link className="owner-button owner-button-outline" to="/owner/properties">Cancel</Link>
            <button className="owner-button owner-button-primary" type="submit">Preview listing <span aria-hidden="true">→</span></button>
          </div>
        </form>

        <aside className="owner-form-aside">
          <div className="owner-aside-card">
            <span className="owner-aside-icon" aria-hidden="true">✦</span>
            <span className="owner-eyebrow">A GOOD FIRST IMPRESSION</span>
            <h2>Make your listing feel like home.</h2>
            <p>Accurate details help renters find a place that suits them. You can add photos and more information later.</p>
          </div>
          <div className="owner-aside-note">
            <span aria-hidden="true">🔒</span>
            <p>Your contact details stay private until you choose to connect with a renter.</p>
          </div>
          {preview && (
            <div className="owner-preview-card" role="status">
              <span className="owner-eyebrow">PREVIEW ONLY</span>
              <strong>{preview.name}</strong>
              <p>{preview.propertyType} · ৳{Number(preview.rent).toLocaleString()} / month</p>
              <p>{preview.address}, {preview.area}, {preview.city}</p>
              <small>This preview is not saved or published.</small>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

export default AddProperty;