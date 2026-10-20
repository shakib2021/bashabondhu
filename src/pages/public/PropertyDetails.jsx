import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import '../../components/common/footer.css';
import {
  createContactRequest,
  createPropertyComment,
  createPropertyCommentReply,
  getMyContactRequest,
  getOwnerContactDetails,
  getPublicProperty,
} from '../../utils/propertyApi';
import { getStoredUser } from '../../utils/authStorage';
import './PropertyDetails.css';

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Recently'
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}

function PropertyDetails() {
  const { propertyId } = useParams();
  const location = useLocation();
  const [property, setProperty] = useState(null);
  const [loadStatus, setLoadStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [replyToCommentId, setReplyToCommentId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [isPostingReply, setIsPostingReply] = useState(false);
  const [contactRequest, setContactRequest] = useState(null);
  const [contactRequestError, setContactRequestError] = useState('');
  const [isRequestingContact, setIsRequestingContact] = useState(false);
  const [ownerContact, setOwnerContact] = useState(null);
  const [ownerContactError, setOwnerContactError] = useState('');
  const [isLoadingOwnerContact, setIsLoadingOwnerContact] = useState(false);
  const session = getStoredUser();
  const isTenant = session?.token && (session.role || session.accountType) === 'tenant';

  useEffect(() => {
    let isMounted = true;
    setLoadStatus('loading');

    getPublicProperty(propertyId)
      .then((listing) => {
        if (isMounted) {
          setProperty(listing);
          setLoadStatus('ready');
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message || 'Could not load this property.');
          setLoadStatus('error');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  useEffect(() => {
    if (!isTenant) return undefined;
    let isMounted = true;
    getMyContactRequest(propertyId)
      .then((request) => {
        if (isMounted) setContactRequest(request);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [isTenant, propertyId]);

  useEffect(() => {
    if (!isTenant || contactRequest?.status !== 'accepted') {
      setOwnerContact(null);
      setOwnerContactError('');
      return undefined;
    }

    let isMounted = true;
    setIsLoadingOwnerContact(true);
    getOwnerContactDetails(propertyId)
      .then((details) => {
        if (isMounted) setOwnerContact(details);
      })
      .catch((error) => {
        if (isMounted) setOwnerContactError(error.message || 'Could not load owner contact details.');
      })
      .finally(() => {
        if (isMounted) setIsLoadingOwnerContact(false);
      });
    return () => {
      isMounted = false;
    };
  }, [contactRequest?.status, isTenant, propertyId]);

  const handleCommentSubmit = async (event) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text) {
      setCommentError('Write a comment before posting.');
      return;
    }

    setIsPosting(true);
    setCommentError('');
    try {
      const comment = await createPropertyComment(propertyId, text);
      setProperty((currentProperty) => ({
        ...currentProperty,
        comments: [...currentProperty.comments, comment],
      }));
      setCommentText('');
    } catch (error) {
      setCommentError(error.message || 'Could not post your comment.');
    } finally {
      setIsPosting(false);
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
      const reply = await createPropertyCommentReply(propertyId, commentId, text);
      setProperty((currentProperty) => ({
        ...currentProperty,
        comments: currentProperty.comments.map((comment) => (
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

  const handleContactRequest = async () => {
    setIsRequestingContact(true);
    setContactRequestError('');
    try {
      const request = await createContactRequest(propertyId);
      setContactRequest(request);
    } catch (error) {
      setContactRequestError(error.message || 'Could not request contact.');
    } finally {
      setIsRequestingContact(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="property-detail-page section-wrap">
        <Link className="property-back-link" to="/#homes"><span aria-hidden="true">←</span> Back to homes</Link>
        {loadStatus === 'loading' && <p className="property-page-state" role="status">Loading property…</p>}
        {loadStatus === 'error' && (
          <section className="property-page-state" role="alert">
            <h1>Property unavailable</h1>
            <p>{errorMessage}</p>
            <Link className="property-action-link" to="/#homes">Browse available homes</Link>
          </section>
        )}
        {loadStatus === 'ready' && property && (
          <>
            <section className="property-detail-layout" aria-labelledby="property-title">
              <div className="property-detail-main">
                <div className="property-detail-image">
                  {property.images?.[0] ? (
                    <img src={property.images[0]} alt={`${property.title} accommodation`} />
                  ) : (
                    <div className="property-image-placeholder" aria-label="No property photo available">
                      <div className="card-building">
                        <span className="building-roof" />
                        <span className="building-face"><i /><i /><i /><i /></span>
                      </div>
                      <span className="card-plant" />
                    </div>
                  )}
                </div>
                <div className="property-detail-heading">
                  <p className="property-detail-location"><span aria-hidden="true">⌖</span> {property.location}, {property.city}</p>
                  <h1 id="property-title">{property.title}</h1>
                  <p className="property-detail-type">{property.accommodation_type}</p>
                  <div className="property-detail-badges">
                    {property.owner?.isVerified && <span className="detail-badge detail-badge-verified">Verified owner</span>}
                    {Number(property.rating) >= 4.5 && <span className="detail-badge detail-badge-popular">Popular · ★ {property.rating}</span>}
                    <span className="detail-posted">Posted {formatDate(property.createdAt)}</span>
                  </div>
                </div>

                <dl className="property-facts">
                  <div><dt>Monthly rent</dt><dd>৳ {Number(property.monthly_rent).toLocaleString()}</dd></div>
                  <div><dt>Bedrooms</dt><dd>{property.bedrooms}</dd></div>
                  <div><dt>Bathrooms</dt><dd>{property.bathrooms}</dd></div>
                  <div><dt>Rooms</dt><dd>{property.number_of_rooms}</dd></div>
                  <div><dt>Suitable for</dt><dd>{property.gender === 'any' ? 'Any gender' : property.gender === 'men' ? 'Men' : 'Women'}</dd></div>
                </dl>

                <section className="property-description">
                  <h2>About this place</h2>
                  <p>{property.description || 'The owner has not added a description yet.'}</p>
                  {property.address && <p className="property-street-address">{property.address}</p>}
                </section>

                {property.facilities?.length > 0 && (
                  <section className="property-facilities">
                    <h2>Facilities</h2>
                    <ul>{property.facilities.map((facility) => <li key={facility}>{facility}</li>)}</ul>
                  </section>
                )}

                <section className="property-comments" aria-labelledby="comments-heading">
                  <div className="property-comments-heading">
                    <div>
                      <span className="property-detail-eyebrow">COMMUNITY</span>
                      <h2 id="comments-heading">Comments <span>{property.comments.length}</span></h2>
                    </div>
                  </div>
                  {session?.token ? (
                    <form className="property-comment-form" onSubmit={handleCommentSubmit}>
                      <label htmlFor="property-comment">Share a question or comment</label>
                      <textarea
                        id="property-comment"
                        value={commentText}
                        onChange={(event) => setCommentText(event.target.value)}
                        maxLength={1000}
                        rows={3}
                        placeholder="Ask about the home, location, or availability…"
                        required
                      />
                      {commentError && <p className="property-comment-error" role="alert">{commentError}</p>}
                      <div className="property-comment-actions">
                        <span>{commentText.length}/1000</span>
                        <button className="property-action-button" type="submit" disabled={isPosting || !commentText.trim()}>
                          {isPosting ? 'Posting…' : 'Post comment'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="property-signin-prompt">
                      <Link to="/login" state={{ from: `${location.pathname}${location.search}` }}>Sign in</Link> to join the conversation.
                    </p>
                  )}
                  {property.comments.length > 0 ? (
                    <div className="property-comment-list">
                      {property.comments.map((comment, index) => (
                        <article
                          className="property-comment-thread"
                          id={comment._id ? `comment-${comment._id}` : undefined}
                          key={comment._id || `${comment.createdAt}-${index}`}
                        >
                          <div className="property-comment">
                            <div className="property-comment-meta">
                              <strong>{comment.author}</strong>
                              <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
                            </div>
                            <p>{comment.text}</p>
                          </div>
                          {comment.replies?.length > 0 && (
                            <div className="property-replies" aria-label={`Replies to ${comment.author}`}>
                              {comment.replies.map((reply, replyIndex) => (
                                <article
                                  className="property-reply"
                                  id={reply._id ? `reply-${reply._id}` : undefined}
                                  key={reply._id || `${reply.createdAt}-${replyIndex}`}
                                >
                                  <div className="property-comment-meta">
                                    <strong>{reply.author}</strong>
                                    <time dateTime={reply.createdAt}>{formatDate(reply.createdAt)}</time>
                                  </div>
                                  <p>{reply.text}</p>
                                </article>
                              ))}
                            </div>
                          )}
                          {session?.token && replyToCommentId !== comment._id && (
                            <button
                              className="property-reply-trigger"
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
                            <form className="property-reply-form" onSubmit={(event) => handleReplySubmit(event, comment._id)}>
                              <label htmlFor={`reply-${comment._id}`}>Reply to {comment.author}</label>
                              <textarea
                                id={`reply-${comment._id}`}
                                value={replyText}
                                onChange={(event) => setReplyText(event.target.value)}
                                maxLength={1000}
                                rows={2}
                                required
                              />
                              {replyError && <p className="property-comment-error" role="alert">{replyError}</p>}
                              <div className="property-reply-actions">
                                <button
                                  className="property-reply-cancel"
                                  type="button"
                                  disabled={isPostingReply}
                                  onClick={() => {
                                    setReplyToCommentId(null);
                                    setReplyText('');
                                    setReplyError('');
                                  }}
                                >
                                  Cancel
                                </button>
                                <button className="property-action-button" type="submit" disabled={isPostingReply || !replyText.trim()}>
                                  {isPostingReply ? 'Posting…' : 'Post reply'}
                                </button>
                              </div>
                            </form>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="property-no-comments">No comments yet. Start the conversation.</p>
                  )}
                </section>
              </div>

              <aside className="property-owner-panel" id="contact-request">
                <span className="property-detail-eyebrow">LISTED BY</span>
                <strong>{property.owner?.fullName || 'Property owner'}</strong>
                {property.owner?.isVerified && <span className="detail-badge detail-badge-verified">Verified owner</span>}
                {isTenant ? (
                  <>
                    <p>Send a request to ask the owner about this home.</p>
                    {contactRequest?.status === 'pending' ? (
                      <span className="contact-request-state">Request sent · awaiting response</span>
                    ) : contactRequest?.status === 'accepted' ? (
                      <>
                        <span className="contact-request-state is-accepted">Request accepted</span>
                        {isLoadingOwnerContact && <span className="owner-contact-loading">Loading owner details…</span>}
                        {ownerContactError && <span className="property-comment-error" role="alert">{ownerContactError}</span>}
                        {ownerContact && (
                          <div className="owner-contact-details">
                            <span className="property-detail-eyebrow">OWNER CONTACT</span>
                            <strong>{ownerContact.fullName}</strong>
                            <span>{ownerContact.occupation || 'Occupation not provided'}</span>
                            {ownerContact.phone
                              ? <a href={`tel:${ownerContact.phone}`}>{ownerContact.phone}</a>
                              : <span>Phone not provided</span>}
                            {ownerContact.email
                              ? <a href={`mailto:${ownerContact.email}`}>{ownerContact.email}</a>
                              : <span>Email not provided</span>}
                          </div>
                        )}
                      </>
                    ) : (
                      <button
                        className="property-action-button"
                        type="button"
                        disabled={isRequestingContact}
                        onClick={handleContactRequest}
                      >
                        {isRequestingContact ? 'Sending…' : contactRequest?.status === 'rejected' ? 'Request contact again' : 'Request contact'}
                      </button>
                    )}
                    {contactRequestError && <p className="property-comment-error" role="alert">{contactRequestError}</p>}
                  </>
                ) : session?.token ? (
                  <p>Contact requests are available to tenant accounts.</p>
                ) : (
                  <>
                    <p>Sign in as a tenant to request contact about this home.</p>
                    <Link className="property-action-link" to="/login" state={{ from: `${location.pathname}${location.search}#contact-request` }}>
                      Sign in to request contact
                    </Link>
                  </>
                )}
              </aside>
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

export default PropertyDetails;