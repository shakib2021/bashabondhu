import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, House } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import '../../components/common/footer.css';
import { getStoredUser } from '../../utils/authStorage';
import {
  createMarketplaceComment,
  createMarketplaceCommentReply,
  createMarketplaceOffer,
  getMarketplaceItem,
} from '../../utils/marketplaceApi';
import './Marketplace.css';

const formatPrice = (value) => `৳${Number(value).toLocaleString('en-BD')}`;

function MarketplaceItemDetails() {
  const { itemId } = useParams();
  const session = getStoredUser();
  const [item, setItem] = useState(null);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [replyToCommentId, setReplyToCommentId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [isPostingReply, setIsPostingReply] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getMarketplaceItem(itemId)
      .then((result) => {
        if (isMounted) {
          setItem(result);
          setStatus('ready');
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message || 'Could not load this item.');
          setStatus('error');
        }
      });
    return () => {
      isMounted = false;
    };
  }, [itemId]);

  const handleOffer = async (event) => {
    event.preventDefault();
    setNotice('');
    setIsSubmitting(true);
    try {
      await createMarketplaceOffer(itemId, { amount: Number(offerAmount) });
      setOfferAmount('');
      setNotice('Your offer has been sent to the seller.');
    } catch (error) {
      setNotice(error.message || 'Could not send your offer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = async (event) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text) {
      setCommentError('Write a comment before posting.');
      return;
    }

    setIsPostingComment(true);
    setCommentError('');
    try {
      const comment = await createMarketplaceComment(itemId, text);
      setItem((current) => ({ ...current, comments: [...current.comments, comment] }));
      setCommentText('');
    } catch (error) {
      setCommentError(error.message || 'Could not post your comment.');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleReplySubmit = async (event, commentId) => {
    event.preventDefault();
    const text = replyText.trim();
    if (!text) {
      setReplyError('Write a reply before posting.');
      return;
    }

    setIsPostingReply(true);
    setReplyError('');
    try {
      const reply = await createMarketplaceCommentReply(itemId, commentId, text);
      setItem((current) => ({
        ...current,
        comments: current.comments.map((comment) => (
          comment._id === commentId
            ? { ...comment, replies: [...(comment.replies || []), reply] }
            : comment
        )),
      }));
      setReplyText('');
      setReplyToCommentId(null);
    } catch (error) {
      setReplyError(error.message || 'Could not post your reply.');
    } finally {
      setIsPostingReply(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="marketplace-page marketplace-detail-page">
        <Link className="marketplace-back-link" to="/marketplace"><ArrowLeft aria-hidden="true" /> Back to marketplace</Link>
        {status === 'loading' && <p className="marketplace-state">Loading item…</p>}
        {status === 'error' && <p className="marketplace-state marketplace-error" role="alert">{errorMessage}</p>}
        {status === 'ready' && item && (
          <div className="marketplace-detail-layout">
            <section className="marketplace-detail-gallery" aria-label="Item photos">
              {item.images?.length
                ? item.images.map((image, index) => <img src={image} alt={`${item.title}, view ${index + 1}`} key={image} />)
                : <div className="marketplace-detail-placeholder" aria-hidden="true"><House /></div>}
            </section>
            <div className="marketplace-detail-copy">
              <span className={`marketplace-status ${item.status === 'sold' ? 'is-sold' : ''}`}>
                {item.status === 'sold' ? 'Sold' : 'Available'}
              </span>
              <h1>{item.title}</h1>
              <p className="marketplace-detail-price">{formatPrice(item.price)}</p>
              <div className="marketplace-detail-facts">
                <span><small>Condition</small><strong>{item.condition}</strong></span>
                <span><small>Location</small><strong>{item.location}</strong></span>
                <span><small>Seller</small><strong>{item.sellerName}</strong></span>
              </div>
              {item.description && (
                <div className="marketplace-description">
                  <h2>About this item</h2>
                  <p>{item.description}</p>
                </div>
              )}
              {item.status === 'available' && session?.token && session.id !== item.sellerId && (
                <form className="marketplace-offer-form" onSubmit={handleOffer}>
                  <h2>Make an offer</h2>
                  <label htmlFor="offer-amount">Your offer (৳)</label>
                  <input
                    id="offer-amount"
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={offerAmount}
                    onChange={(event) => setOfferAmount(event.target.value)}
                  />
                  <button className="marketplace-primary-button" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Sending…' : 'Send offer'}
                  </button>
                  {notice && <p className="marketplace-form-notice" role="status">{notice}</p>}
                </form>
              )}
              {item.status === 'available' && !session?.token && (
                <div className="marketplace-sign-in-note">
                  <p>Sign in to make an offer or join the conversation.</p>
                  <Link className="marketplace-primary-button" to="/login" state={{ from: `/marketplace/items/${itemId}` }}>Sign in to make an offer</Link>
                </div>
              )}
              {session?.id === item.sellerId && (
                <div className="marketplace-owner-note">
                  <p>This is your listing. Manage buyer offers from your marketplace workspace.</p>
                  <Link to="/marketplace/my-listings">Manage my listings</Link>
                </div>
              )}
                <section className="marketplace-comments" aria-labelledby="marketplace-comments-heading">
                  <div className="marketplace-comments-heading">
                    <span className="marketplace-eyebrow">COMMUNITY</span>
                    <h2 id="marketplace-comments-heading">Comments <span>{item.comments?.length || 0}</span></h2>
                  </div>
                  {item.status === 'available' && (session?.token ? (
                    <form className="marketplace-comment-form" onSubmit={handleCommentSubmit}>
                      <label htmlFor="marketplace-comment">Share a question or comment</label>
                      <textarea
                        id="marketplace-comment"
                        value={commentText}
                        onChange={(event) => setCommentText(event.target.value)}
                        maxLength={1000}
                        rows={3}
                        placeholder="Ask about the item, condition, or pickup…"
                        required
                      />
                      {commentError && <p className="marketplace-comment-error" role="alert">{commentError}</p>}
                      <div className="marketplace-comment-actions">
                        <span>{commentText.length}/1000</span>
                        <button type="submit" disabled={isPostingComment || !commentText.trim()}>
                          {isPostingComment ? 'Posting…' : 'Post comment'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="marketplace-signin-prompt">
                      <Link to="/login" state={{ from: `/marketplace/items/${itemId}` }}>Sign in</Link> to join the conversation.
                    </p>
                  ))}
                  {item.comments?.length > 0 ? (
                    <div className="marketplace-comment-list">
                      {item.comments.map((comment, index) => (
                        <article
                          className="marketplace-comment-thread"
                          id={comment._id ? `comment-${comment._id}` : undefined}
                          key={comment._id || `${comment.createdAt}-${index}`}
                        >
                          <div className="marketplace-comment-meta">
                            <strong>{comment.author}</strong>
                            <time dateTime={comment.createdAt}>{comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : 'Recently'}</time>
                          </div>
                          <p>{comment.text}</p>
                          {comment.replies?.length > 0 && (
                            <div className="marketplace-replies" aria-label={`Replies to ${comment.author}`}>
                              {comment.replies.map((reply, replyIndex) => (
                                <article
                                  className="marketplace-reply"
                                  id={reply._id ? `reply-${reply._id}` : undefined}
                                  key={reply._id || `${reply.createdAt}-${replyIndex}`}
                                >
                                  <div className="marketplace-comment-meta">
                                    <strong>{reply.author}</strong>
                                    <time dateTime={reply.createdAt}>{reply.createdAt ? new Date(reply.createdAt).toLocaleDateString() : 'Recently'}</time>
                                  </div>
                                  <p>{reply.text}</p>
                                </article>
                              ))}
                            </div>
                          )}
                          {session?.token && item.status === 'available' && replyToCommentId !== comment._id && (
                            <button
                              className="marketplace-reply-trigger"
                              type="button"
                              onClick={() => {
                                setReplyToCommentId(comment._id);
                                setReplyText('');
                                setReplyError('');
                              }}
                            >
                              Reply
                            </button>
                          )}
                          {replyToCommentId === comment._id && (
                            <form className="marketplace-reply-form" onSubmit={(event) => handleReplySubmit(event, comment._id)}>
                              <label htmlFor={`marketplace-reply-${comment._id}`}>Reply to {comment.author}</label>
                              <textarea
                                id={`marketplace-reply-${comment._id}`}
                                value={replyText}
                                onChange={(event) => setReplyText(event.target.value)}
                                maxLength={1000}
                                rows={2}
                                required
                              />
                              {replyError && <p className="marketplace-comment-error" role="alert">{replyError}</p>}
                              <div className="marketplace-comment-actions">
                                <button type="button" disabled={isPostingReply} onClick={() => setReplyToCommentId(null)}>Cancel</button>
                                <button type="submit" disabled={isPostingReply || !replyText.trim()}>
                                  {isPostingReply ? 'Posting…' : 'Post reply'}
                                </button>
                              </div>
                            </form>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="marketplace-no-comments">No comments yet. Start the conversation.</p>
                  )}
                </section>
                <p className="marketplace-offline-note">Transactions and payment take place offline between the buyer and seller.</p>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default MarketplaceItemDetails;
