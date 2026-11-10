import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import '../../components/common/footer.css';
import { getStoredUser } from '../../utils/authStorage';
import { createMarketplaceItem } from '../../utils/marketplaceApi';
import './Marketplace.css';

const MAX_PHOTOS = 6;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_PHOTO_SIZE = 12 * 1024 * 1024;

function SellMarketplaceItem() {
  const navigate = useNavigate();
  const session = getStoredUser();
  const [images, setImages] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!session?.token) {
    return <Navigate to="/login" replace state={{ from: '/marketplace/sell' }} />;
  }

  const handleImages = (event) => {
    setErrorMessage('');
    const files = Array.from(event.target.files || []);
    if (files.length > MAX_PHOTOS) {
      setErrorMessage(`Choose up to ${MAX_PHOTOS} photos.`);
      event.target.value = '';
      setImages([]);
      return;
    }
    if (files.some((file) => file.size > MAX_PHOTO_SIZE)) {
      setErrorMessage('Each photo must be 5 MB or smaller.');
      event.target.value = '';
      setImages([]);
      return;
    }
    if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_PHOTO_SIZE) {
      setErrorMessage('Your photos must total 12 MB or less.');
      event.target.value = '';
      setImages([]);
      return;
    }
    setImages(files);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSaving(true);
    const values = new FormData(event.currentTarget);
    try {
      const item = await createMarketplaceItem({
        title: values.get('title'),
        description: values.get('description'),
        price: Number(values.get('price')),
        condition: values.get('condition'),
        location: values.get('location'),
      }, images);
      navigate(`/marketplace/items/${item._id}`);
    } catch (error) {
      setErrorMessage(error.message || 'Could not publish your item.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="marketplace-page marketplace-form-page">
        <Link className="marketplace-back-link" to="/marketplace"><ArrowLeft aria-hidden="true" /> Back to marketplace</Link>
        <section className="marketplace-form-card">
          <span className="marketplace-eyebrow">SELL TO YOUR COMMUNITY</span>
          <h1>List an item</h1>
          <p>Post directly—no admin approval needed. Coordinate offers and payment with buyers offline.</p>
          <form onSubmit={handleSubmit}>
            <label htmlFor="item-title">Item name</label>
            <input id="item-title" name="title" type="text" maxLength="120" required placeholder="e.g. Study table" />

            <label htmlFor="item-description">Description <span>(optional)</span></label>
            <textarea id="item-description" name="description" rows="4" maxLength="2000" placeholder="Share useful details about the item." />

            <div className="marketplace-form-row">
              <div>
                <label htmlFor="item-price">Price (৳)</label>
                <input id="item-price" name="price" type="number" min="1" step="1" required placeholder="5000" />
              </div>
              <div>
                <label htmlFor="item-condition">Condition</label>
                <select id="item-condition" name="condition" defaultValue="Good" required>
                  <option value="New">New</option>
                  <option value="Like new">Like new</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                </select>
              </div>
            </div>

            <label htmlFor="item-location">Location</label>
            <input id="item-location" name="location" type="text" maxLength="255" required placeholder="Area, city" />

            <label htmlFor="item-images">Photos <span>(up to 6, 5 MB each)</span></label>
            <input id="item-images" name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImages} />
            {images.length > 0 && <p className="marketplace-file-count">{images.length} photo{images.length === 1 ? '' : 's'} selected</p>}
            {errorMessage && <p className="marketplace-form-error" role="alert">{errorMessage}</p>}
            <button className="marketplace-primary-button" type="submit" disabled={isSaving}>
              {isSaving ? 'Publishing…' : 'Publish listing'}
            </button>
          </form>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default SellMarketplaceItem;
