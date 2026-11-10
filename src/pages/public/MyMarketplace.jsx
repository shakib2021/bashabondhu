import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import '../../components/common/footer.css';
import { getStoredUser } from '../../utils/authStorage';
import {
  getMyMarketplaceItems,
  getMyMarketplaceOffers,
  markMarketplaceItemSold,
  respondToMarketplaceOffer,
} from '../../utils/marketplaceApi';
import './Marketplace.css';

const formatPrice = (value) => `৳${Number(value).toLocaleString('en-BD')}`;

function SellerOffer({ itemId, offer, onRespond }) {
  const [errorMessage, setErrorMessage] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  const respond = async (status) => {
    setErrorMessage('');
    setIsResponding(true);
    try {
      await onRespond(itemId, offer._id, { status });
    } catch (error) {
      setErrorMessage(error.message || 'Could not respond to this offer.');
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <article className="marketplace-offer-card">
      <div className="marketplace-offer-heading">
        <strong>{offer.buyerName}</strong>
        <span className={`marketplace-status is-${offer.status}`}>{offer.status}</span>
      </div>
      <p className="marketplace-offer-amount">{formatPrice(offer.amount)}</p>
      {offer.status === 'pending' && (
        <div className="marketplace-respond-form">
          {errorMessage && <p className="marketplace-form-error" role="alert">{errorMessage}</p>}
          <div className="marketplace-offer-actions">
            <button type="button" onClick={() => respond('accepted')} disabled={isResponding}>
              Accept offer
            </button>
            <button className="marketplace-reject-button" type="button" onClick={() => respond('rejected')} disabled={isResponding}>
              Reject
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function MyMarketplace() {
  const session = getStoredUser();
  const [items, setItems] = useState([]);
  const [myOffers, setMyOffers] = useState([]);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [actionErrorMessage, setActionErrorMessage] = useState('');

  const loadWorkspace = useCallback(async () => {
    setStatus('loading');
    setErrorMessage('');
    try {
      const [sellerItems, buyerOffers] = await Promise.all([
        getMyMarketplaceItems(),
        getMyMarketplaceOffers(),
      ]);
      setItems(sellerItems);
      setMyOffers(buyerOffers);
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error.message || 'Could not load your marketplace workspace.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const handleRespond = async (itemId, offerId, response) => {
    const updatedOffer = await respondToMarketplaceOffer(itemId, offerId, response);
    setItems((current) => current.map((item) => (
      String(item._id) !== String(itemId)
        ? item
        : {
          ...item,
          offers: item.offers.map((offer) => (
            String(offer._id) === String(offerId) ? updatedOffer : offer
          )),
        }
    )));
  };

  const handleMarkSold = async (itemId) => {
    setActionErrorMessage('');
    try {
      const updatedItem = await markMarketplaceItemSold(itemId);
      setItems((current) => current.map((item) => (
        String(item._id) === String(itemId) ? updatedItem : item
      )));
    } catch (error) {
      setActionErrorMessage(error.message || 'Could not mark this item as sold.');
    }
  };

  if (!session?.token) {
    return <Navigate to="/login" replace state={{ from: '/marketplace/my-listings' }} />;
  }

  return (
    <>
      <Navbar />
      <main className="marketplace-page marketplace-workspace">
        <div className="marketplace-workspace-heading">
          <div>
            <span className="marketplace-eyebrow">YOUR COMMUNITY MARKET</span>
            <h1>My listings &amp; offers</h1>
            <p>Manage items you’re selling and follow up on offers you’ve made.</p>
          </div>
          <Link className="marketplace-primary-button" to="/marketplace/sell">+ List an item</Link>
        </div>
        {status === 'loading' && <p className="marketplace-state">Loading your marketplace…</p>}
        {status === 'error' && (
          <div className="marketplace-state marketplace-error" role="alert">
            <p>{errorMessage}</p>
            <button type="button" onClick={loadWorkspace}>Try again</button>
          </div>
        )}
        {status === 'ready' && (
          <>
            {actionErrorMessage && <p className="marketplace-form-error" role="alert">{actionErrorMessage}</p>}
            <section className="marketplace-workspace-section">
              <h2>Items you’re selling <span>{items.length}</span></h2>
              {items.length === 0
                ? <p className="marketplace-workspace-empty">You haven’t listed an item yet. <Link to="/marketplace/sell">Create your first listing</Link>.</p>
                : items.map((item) => (
                  <article className="marketplace-manage-card" id={`listing-${item._id}`} key={item._id}>
                    <div className="marketplace-manage-heading">
                      <div>
                        <Link to={`/marketplace/items/${item._id}`}><h3>{item.title}</h3></Link>
                        <p>{formatPrice(item.price)} · {item.location}</p>
                      </div>
                      <span className={`marketplace-status ${item.status === 'sold' ? 'is-sold' : ''}`}>
                        {item.status === 'sold' ? 'Sold' : 'Available'}
                      </span>
                    </div>
                    {item.status === 'available' && (
                      <button className="marketplace-mark-sold" type="button" onClick={() => handleMarkSold(item._id)}>
                        Mark as sold
                      </button>
                    )}
                    <div className="marketplace-offers-list">
                      <h4>Buyer offers ({item.offers?.length || 0})</h4>
                      {item.offers?.length
                        ? item.offers.map((offer) => (
                          <SellerOffer
                            itemId={item._id}
                            offer={offer}
                            onRespond={handleRespond}
                            key={offer._id}
                          />
                        ))
                        : <p>No offers yet.</p>}
                    </div>
                  </article>
                ))}
            </section>

            <section className="marketplace-workspace-section" id="my-offers">
              <h2>Offers you’ve made <span>{myOffers.length}</span></h2>
              {myOffers.length === 0
                ? <p className="marketplace-workspace-empty">You haven’t made any offers yet. <Link to="/marketplace">Browse items</Link>.</p>
                : <div className="marketplace-my-offers">
                  {myOffers.map(({ item, offer }) => (
                    <article className="marketplace-my-offer-card" key={offer._id}>
                      <div>
                        <Link to={`/marketplace/items/${item._id}`}><h3>{item.title}</h3></Link>
                        <p>Your offer: <strong>{formatPrice(offer.amount)}</strong></p>
                        <p>Seller: {item.sellerName}</p>
                      </div>
                      <span className={`marketplace-status is-${offer.status}`}>{offer.status}</span>
                    </article>
                  ))}
                </div>}
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

export default MyMarketplace;
