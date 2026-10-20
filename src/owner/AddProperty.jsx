import { Link, useOutletContext } from 'react-router-dom';
import { useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createProperty } from '../utils/propertyApi';

const accommodationTypes = [
  'Mess',
  'Sublet',
  'Bachelor accommodation',
  'Rental room',
  'Rental house',
];

const listingStatuses = ['Available', 'Booked', 'Rented'];
const rentalGenders = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'any', label: 'Any gender' },
];

function AddProperty() {
  const { profile } = useOutletContext();
  const [preview, setPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePreview = async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const splitLines = (value) => value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);

    const listing = {
      title: values.get('title'),
      description: values.get('description'),
      accommodation_type: values.get('accommodation_type'),
      city: values.get('city'),
      location: values.get('location'),
      address: values.get('address'),
      monthly_rent: Number(values.get('monthly_rent')),
      number_of_rooms: Number(values.get('number_of_rooms')),
      bedrooms: Number(values.get('bedrooms')),
      bathrooms: Number(values.get('bathrooms')),
      facilities: splitLines(values.get('facilities')),
      images: splitLines(values.get('images')),
      status: values.get('status'),
      gender: values.get('gender'),
      email: profile.email,
    };

    setIsSaving(true);
    setErrorMessage('');
    try {
      const savedListing = await createProperty(listing);
      setPreview(savedListing);
      toast.success('Your listing has been saved.');
    } catch (error) {
      setErrorMessage(error.message || 'Could not save this listing. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={4000} />
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
                <span>Title <i>*</i></span>
                <input type="text" name="title" placeholder="e.g. Sunny rental room in Dhanmondi" required />
              </label>
              <label className="owner-field owner-field-wide">
                <span>Owner email</span>
                <input type="email" name="email" value={profile.email} readOnly />
              </label>
              <label className="owner-field">
                <span>Accommodation type <i>*</i></span>
                <select name="accommodation_type" defaultValue="" required>
                  <option value="" disabled>Select a type</option>
                  {accommodationTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="owner-field">
                <span>Monthly rent (৳) <i>*</i></span>
                <input type="number" name="monthly_rent" min="0" step="0.01" placeholder="e.g. 25000" required />
              </label>
              <label className="owner-field">
                <span>Listing status</span>
                <select name="status" defaultValue="Available">
                  {listingStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="owner-field">
                <span>Rent is for <i>*</i></span>
                <select name="gender" defaultValue="any" required>
                  {rentalGenders.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="owner-form-section">
            <h3><span>02</span> Location</h3>
            <div className="owner-form-grid">
              <label className="owner-field">
                <span>City <i>*</i></span>
                <input type="text" name="city" placeholder="e.g. Dhaka" required />
              </label>
              <label className="owner-field">
                <span>Area / neighborhood <i>*</i></span>
                <input type="text" name="location" placeholder="e.g. Dhanmondi" required />
              </label>
              <label className="owner-field owner-field-wide">
                <span>Street address</span>
                <input type="text" name="address" placeholder="House and road (optional)" />
              </label>
            </div>
          </div>

          <div className="owner-form-section">
            <h3><span>03</span> A few more details</h3>
            <div className="owner-form-grid owner-form-grid-three">
              <label className="owner-field">
                <span>Number of rooms <i>*</i></span>
                <input type="number" name="number_of_rooms" min="1" step="1" defaultValue="1" required />
              </label>
              <label className="owner-field">
                <span>Bedrooms <i>*</i></span>
                <input type="number" name="bedrooms" min="1" step="1" defaultValue="1" required />
              </label>
              <label className="owner-field">
                <span>Bathrooms <i>*</i></span>
                <input type="number" name="bathrooms" min="1" step="1" defaultValue="1" required />
              </label>
              <label className="owner-field owner-field-wide">
                <span>Description</span>
                <textarea name="description" rows="4" placeholder="What makes this home special? Include anything renters should know." />
              </label>
              <label className="owner-field owner-field-wide">
                <span>Facilities</span>
                <textarea name="facilities" rows="3" placeholder={'One facility per line, e.g.\nWi-Fi\nParking'} />
              </label>
              <label className="owner-field owner-field-wide">
                <span>Image URLs</span>
                <textarea name="images" rows="3" placeholder={'One image URL per line'} />
              </label>
            </div>
          </div>

          <div className="owner-form-actions">
            <Link className="owner-button owner-button-outline" to="/owner/properties">Cancel</Link>
            <button className="owner-button owner-button-primary" type="submit" disabled={isSaving}>
              {isSaving ? 'Posting…' : 'Post listing'} <span aria-hidden="true">→</span>
            </button>
          </div>
          {errorMessage && <p className="owner-form-message" role="alert">{errorMessage}</p>}
        </form>

        <aside className="owner-form-aside">
          <div className="owner-aside-card">
            <span className="owner-aside-icon" aria-hidden="true">✦</span>
            <span className="owner-eyebrow">A GOOD FIRST IMPRESSION</span>
            <h2>Make your listing feel like home.</h2>
            <p>Accurate details help renters find a place that suits them. Add facilities and image URLs to make your listing more helpful.</p>
          </div>
          <div className="owner-aside-note">
            <span aria-hidden="true">✦</span>
            <p>Enter each facility and image URL on its own line.</p>
          </div>
          {preview && (
            <div className="owner-preview-card" role="status">
              <span className="owner-eyebrow">LISTING SAVED</span>
              <strong>{preview.title}</strong>
              <p>{preview.accommodation_type} · ৳{preview.monthly_rent.toLocaleString()} / month</p>
              <p>{preview.location}, {preview.city}{preview.address ? ` · ${preview.address}` : ''}</p>
              <p>{preview.number_of_rooms} rooms · {preview.bedrooms} bedrooms · {preview.bathrooms} bathrooms</p>
              <p>{preview.status}</p>
              <p>{preview.gender === 'any' ? 'Any gender' : `For ${preview.gender}`}</p>
              <p>Rating: {preview.rating === 0 ? 'No rating' : preview.rating}</p>
              <small>Saved to your properties.</small>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

export default AddProperty;
