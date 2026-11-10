import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, ShoppingBag } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import '../../components/common/footer.css';
import { getMarketplaceItems } from '../../utils/marketplaceApi';
import './Marketplace.css';

const formatPrice = (value) => `৳${Number(value).toLocaleString('en-BD')}`;

function Marketplace() {
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    setStatus('loading');
    getMarketplaceItems(activeSearch)
      .then((results) => {
        if (isMounted) {
          setItems(results);
          setStatus('ready');
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message || 'Could not load marketplace items.');
          setStatus('error');
        }
      });
    return () => {
      isMounted = false;
    };
  }, [activeSearch]);

  const handleSearch = (event) => {
    event.preventDefault();
    setActiveSearch(search.trim());
  };

  return (
    <>
      <Navbar />
      <main className="marketplace-page">
        <section className="marketplace-hero">
          <div>
            <span className="marketplace-eyebrow">BASHABONDHU COMMUNITY MARKET</span>
            <h1>Give good things a new home.</h1>
            <p>Find furniture, appliances, and everyday essentials from people nearby.</p>
            <div className="marketplace-hero-actions">
              <Link className="marketplace-primary-button" to="/marketplace/sell">Sell an item <ArrowRight aria-hidden="true" /></Link>
              <Link className="marketplace-text-link" to="/marketplace/my-listings">My listings &amp; offers</Link>
            </div>
          </div>
          <div className="marketplace-hero-art" aria-hidden="true">
            <span className="marketplace-art-sun" />
            <span className="marketplace-art-sofa"><i /><i /><b /></span>
            <span className="marketplace-art-table" />
            <span className="marketplace-art-plant"><i /><i /><b /></span>
          </div>
        </section>

        <section className="marketplace-content" aria-labelledby="marketplace-list-title">
          <div className="marketplace-section-heading">
            <div>
              <span className="marketplace-eyebrow">PRE-LOVED, READY FOR YOU</span>
              <h2 id="marketplace-list-title">Browse items</h2>
            </div>
            <form className="marketplace-search" onSubmit={handleSearch} role="search">
              <label className="visually-hidden" htmlFor="marketplace-search">Search items by name or location</label>
              <input
                id="marketplace-search"
                type="search"
                placeholder="Search name or location"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button type="submit">Search</button>
            </form>
          </div>

          {status === 'loading' && <p className="marketplace-state">Loading items…</p>}
          {status === 'error' && <p className="marketplace-state marketplace-error" role="alert">{errorMessage}</p>}
          {status === 'ready' && items.length === 0 && (
            <div className="marketplace-empty">
              <Search aria-hidden="true" />
              <h3>No items found</h3>
              <p>Try another search, or be the first to list something for the community.</p>
              <Link className="marketplace-primary-button" to="/marketplace/sell">List an item</Link>
            </div>
          )}
          {status === 'ready' && items.length > 0 && (
            <div className="marketplace-grid">
              {items.map((item) => (
                <Link className="marketplace-card" to={`/marketplace/items/${item._id}`} key={item._id}>
                  <div className="marketplace-card-image">
                    {item.images?.[0]
                      ? <img src={item.images[0]} alt={item.title} />
                      : <span className="marketplace-card-placeholder" aria-hidden="true"><ShoppingBag /></span>}
                    <span className="marketplace-condition">{item.condition}</span>
                  </div>
                  <div className="marketplace-card-copy">
                    <div className="marketplace-card-top">
                      <h3>{item.title}</h3>
                      <strong>{formatPrice(item.price)}</strong>
                    </div>
                    <p>{item.location}</p>
                    <span className="marketplace-card-link">View item <ArrowRight aria-hidden="true" /></span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <p className="marketplace-offline-note">Buying and payment are arranged directly between buyer and seller offline.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default Marketplace;
