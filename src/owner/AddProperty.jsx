import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createProperty, getMyProperties, updateProperty } from '../utils/propertyApi';

const accommodationTypes = [
  'Mess',
  'Sublet',
  'Bachelor accommodation',
  'Rental room',
  'Rental house',
];

const listingStatuses = ['Available', 'Booked', 'Rented'];
const MAX_PROPERTY_PHOTOS = 6;
const MAX_PROPERTY_PHOTO_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_PHOTO_SIZE = 12 * 1024 * 1024;
const rentalGenders = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'any', label: 'Any gender' },
];

function AddProperty() {
  const { profile } = useOutletContext();
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(propertyId);
  const [property, setProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [preview, setPreview] = useState(null);
  const [keptPhotos, setKeptPhotos] = useState([]);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isEditing) return undefined;
    let isMounted = true;

    getMyProperties()
      .then((properties) => {
        const ownedProperty = properties.find((item) => String(item._id || item.id) === propertyId);
        if (!ownedProperty) {
          throw new Error('Property not found in your listings.');
        }
        if (isMounted) {
          setProperty(ownedProperty);
          setKeptPhotos(ownedProperty.images || []);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message || 'Could not load this property.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isEditing, propertyId]);

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
      images: keptPhotos,
      status: values.get('status'),
      gender: values.get('gender'),
      email: profile.email,
    };

    setIsSaving(true);
    setErrorMessage('');
    try {
      const savedListing = isEditing
        ? await updateProperty(propertyId, listing, selectedPhotos)
        : await createProperty(listing, selectedPhotos);
      if (isEditing) {
        toast.success('Your listing has been updated.');
        navigate('/owner/properties');
      } else {
        setPreview(savedListing);
        toast.success('Your listing has been saved.');
      }
    } catch (error) {
      setErrorMessage(error.message || `Could not ${isEditing ? 'update' : 'save'} this listing. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="owner-dashboard-state" role="status">Loading property details…</p>;
  }

  if (isEditing && !property) {
    return (
      <section className="owner-panel owner-dashboard-state" role="alert">
        <p>{errorMessage || 'Could not load this property.'}</p>
        <Link className="owner-button owner-button-outline" to="/owner/properties">Back to properties</Link>
      </section>
    );
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={4000} />
      <section className="owner-page-heading">
        <div>
          <span className="owner-eyebrow">{isEditing ? 'UPDATE YOUR PORTFOLIO' : 'GROW YOUR PORTFOLIO'}</span>
          <h1>{isEditing ? 'Edit property' : 'Add a property'}</h1>
          <p>{isEditing ? 'Update your listing details and photos.' : 'Share the essentials to start putting your home on renters’ radar.'}</p>
        </div>
        <Link className="owner-back-link" to="/owner/properties"><span aria-hidden="true">←</span> Back to properties</Link>
      </section>

      <div className="owner-form-layout">
        <form className="owner-panel owner-property-form" onSubmit={handlePreview}>
          <div className="owner-panel-heading">
            <div>
              <span className="owner-eyebrow">PROPERTY DETAILS</span>
              <h2>{isEditing ? 'Update your place' : 'Tell us about your place'}</h2>
            </div>
            <span className="owner-required-note"><span aria-hidden="true">*</span> Required</span>
          </div>

          <div className="owner-form-section">
            <h3><span>01</span> The basics</h3>
            <div className="owner-form-grid">
              <label className="owner-field owner-field-wide">
                <span>Title <i>*</i></span>
                <input type="text" name="title" defaultValue={property?.title || ''} placeholder="e.g. Sunny rental room in Dhanmondi" required />
              </label>
              <label className="owner-field owner-field-wide">
                <span>Owner email</span>
                <input type="email" name="email" value={profile.email} readOnly />
              </label>
              <label className="owner-field">
                <span>Accommodation type <i>*</i></span>
                <select name="accommodation_type" defaultValue={property?.accommodation_type || ''} required>
                  <option value="" disabled>Select a type</option>
                  {accommodationTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="owner-field">
                <span>Monthly rent (৳) <i>*</i></span>
                <input type="number" name="monthly_rent" min="0" step="0.01" defaultValue={property?.monthly_rent ?? ''} placeholder="e.g. 25000" required />
              </label>
              <label className="owner-field">
                <span>Listing status</span>
                <select name="status" defaultValue={property?.status || 'Available'}>
                  {listingStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="owner-field">
                <span>Rent is for <i>*</i></span>
                <select name="gender" defaultValue={property?.gender || 'any'} required>
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
                <input type="text" name="city" defaultValue={property?.city || ''} placeholder="e.g. Dhaka" required />
              </label>
              <label className="owner-field">
                <span>Area / neighborhood <i>*</i></span>
                <input type="text" name="location" defaultValue={property?.location || ''} placeholder="e.g. Dhanmondi" required />
              </label>
              <label className="owner-field owner-field-wide">
                <span>Street address</span>
                <input type="text" name="address" defaultValue={property?.address || ''} placeholder="House and road (optional)" />
              </label>
            </div>
          </div>

          <div className="owner-form-section">
            <h3><span>03</span> A few more details</h3>
            <div className="owner-form-grid owner-form-grid-three">
              <label className="owner-field">
                <span>Number of rooms <i>*</i></span>
                <input type="number" name="number_of_rooms" min="1" step="1" defaultValue={property?.number_of_rooms || 1} required />
              </label>
              <label className="owner-field">
                <span>Bedrooms <i>*</i></span>
                <input type="number" name="bedrooms" min="1" step="1" defaultValue={property?.bedrooms || 1} required />
              </label>
              <label className="owner-field">
                <span>Bathrooms <i>*</i></span>
                <input type="number" name="bathrooms" min="1" step="1" defaultValue={property?.bathrooms || 1} required />
              </label>
              <label className="owner-field owner-field-wide">
                <span>Description</span>
                <textarea name="description" rows="4" defaultValue={property?.description || ''} placeholder="What makes this home special? Include anything renters should know." />
              </label>
              <label className="owner-field owner-field-wide">
                <span>Facilities</span>
                <textarea name="facilities" rows="3" defaultValue={(property?.facilities || []).join('\n')} placeholder={'One facility per line, e.g.\nWi-Fi\nParking'} />
              </label>
              <label className="owner-field owner-field-wide">
                <span>Property photos</span>
                <input
                  type="file"
                  name="propertyPhotos"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) => {
                    const selected = Array.from(event.target.files || []);
                    const oversizedFile = selected.find((file) => file.size > MAX_PROPERTY_PHOTO_SIZE);
                    const combined = [...selectedPhotos, ...selected];
                    const totalSize = combined.reduce((total, file) => total + file.size, 0);
                    event.target.value = '';
                    if (keptPhotos.length + combined.length > MAX_PROPERTY_PHOTOS) {
                      setErrorMessage('Choose up to 6 property photos.');
                    } else if (oversizedFile) {
                      setErrorMessage(`${oversizedFile.name} is larger than 5 MB.`);
                    } else if (totalSize > MAX_TOTAL_PHOTO_SIZE) {
                      setErrorMessage('Selected property photos must total 12 MB or less.');
                    } else {
                      setErrorMessage('');
                      setSelectedPhotos(combined);
                    }
                  }}
                />
                <small>Keep or choose up to 6 JPEG, PNG, or WebP photos (5 MB each, 12 MB total).</small>
              </label>
              {keptPhotos.length > 0 && (
                <div className="owner-selected-photos owner-field-wide">
                  <span>Current photos</span>
                  <ul className="owner-photo-preview-list">
                    {keptPhotos.map((photo, index) => (
                      <li key={`${photo}-${index}`}>
                        <img src={photo} alt={`Current property ${index + 1}`} />
                        <button
                          type="button"
                          aria-label={`Remove current photo ${index + 1}`}
                          onClick={() => setKeptPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedPhotos.length > 0 && (
                <div className="owner-selected-photos owner-field-wide" role="status">
                  <span>{selectedPhotos.length} photo{selectedPhotos.length === 1 ? '' : 's'} selected</span>
                  <ul>
                    {selectedPhotos.map((photo, index) => (
                      <li key={`${photo.name}-${photo.size}-${photo.lastModified}-${index}`}>
                        <span>{photo.name}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${photo.name}`}
                          onClick={() => setSelectedPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="owner-form-actions">
            <Link className="owner-button owner-button-outline" to="/owner/properties">Cancel</Link>
            <button className="owner-button owner-button-primary" type="submit" disabled={isSaving}>
              {isSaving ? (isEditing ? 'Saving…' : 'Posting…') : (isEditing ? 'Save changes' : 'Post listing')} <span aria-hidden="true">→</span>
            </button>
          </div>
          {errorMessage && <p className="owner-form-message" role="alert">{errorMessage}</p>}
        </form>

        <aside className="owner-form-aside">
          <div className="owner-aside-card">
            <span className="owner-aside-icon" aria-hidden="true">✦</span>
            <span className="owner-eyebrow">A GOOD FIRST IMPRESSION</span>
            <h2>Make your listing feel like home.</h2>
            <p>Accurate details help renters find a place that suits them. Add facilities and clear property photos to make your listing more helpful.</p>
          </div>
          <div className="owner-aside-note">
            <span aria-hidden="true">✦</span>
            <p>Enter each facility on its own line. Upload clear photos of the property.</p>
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
              {preview.images?.length > 0 && (
                <div className="owner-saved-photos" aria-label="Uploaded property photos">
                  {preview.images.map((image, index) => (
                    <img key={`${image}-${index}`} src={image} alt={`Uploaded property ${index + 1}`} />
                  ))}
                </div>
              )}
              <small>Saved to your properties.</small>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

export default AddProperty;
