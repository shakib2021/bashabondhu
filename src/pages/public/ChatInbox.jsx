import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { io } from 'socket.io-client';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { getStoredUser } from '../../utils/authStorage';
import { getChatMessages, getMyChats, sendChatMessage } from '../../utils/chatApi';
import {
  createContactRequest,
  getMyContactRequest,
  getOwnerContactDetails,
} from '../../utils/propertyApi';
import { createVisitRequest, getMyVisitRequest } from '../../utils/visitRequestApi';
import '../../components/common/Chat.css';

const SOCKET_ORIGIN = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

function formatChatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Recently'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatVisitTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Invalid date'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function ChatInbox() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('loading');
  const [realtimeStatus, setRealtimeStatus] = useState('connecting');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [contactRequest, setContactRequest] = useState(null);
  const [contactRequestError, setContactRequestError] = useState('');
  const [isRequestingContact, setIsRequestingContact] = useState(false);
  const [ownerContact, setOwnerContact] = useState(null);
  const [ownerContactError, setOwnerContactError] = useState('');
  const [isLoadingOwnerContact, setIsLoadingOwnerContact] = useState(false);
  const [visitRequest, setVisitRequest] = useState(null);
  const [visitDateTime, setVisitDateTime] = useState('');
  const [visitRequestError, setVisitRequestError] = useState('');
  const [isRequestingVisit, setIsRequestingVisit] = useState(false);
  const endOfMessagesRef = useRef(null);
  const contactRequestVersionRef = useRef(0);
  const visitRequestVersionRef = useRef(0);
  const session = getStoredUser();
  const isTenant = (session?.role || session?.accountType) === 'tenant';
  const requestedConversationId = searchParams.get('conversation');
  const activeChat = chats.find((chat) => chat.id === requestedConversationId) || null;
  const activeChatId = activeChat?.id;
  const activeChatIdRef = useRef(activeChatId);
  activeChatIdRef.current = activeChatId;
  const isRealtimeConnected = realtimeStatus === 'connected';

  const refreshChats = useCallback(async () => {
    const results = await getMyChats();
    setChats(results);
    setStatus('ready');
    setError('');
    return results;
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadChats = async () => {
      try {
        const results = await getMyChats();
        if (!isMounted) return;
        setChats(results);
        setStatus('ready');
        setError('');
        const selectedId = searchParams.get('conversation');
        const requestedPropertyId = searchParams.get('property');
        if (!selectedId && requestedPropertyId) {
          const matchingChat = results.find((chat) => (
            chat.listingType === 'property'
            && String(chat.listingId) === requestedPropertyId
          ));
          if (matchingChat) {
            setSearchParams({ conversation: matchingChat.id }, { replace: true });
          }
        } else if (!selectedId && results.length) {
          setSearchParams({ conversation: results[0].id }, { replace: true });
        }
      } catch (loadError) {
        if (isMounted) {
          setStatus('error');
          setError(loadError.message || 'Could not load your messages.');
        }
      }
    };
    loadChats();
    const intervalId = isRealtimeConnected ? null : window.setInterval(loadChats, 15000);
    return () => {
      isMounted = false;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [isRealtimeConnected, searchParams, setSearchParams]);

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return undefined;
    }
    let isMounted = true;
    const loadMessages = async () => {
      try {
        const result = await getChatMessages(activeChatId);
        if (isMounted) {
          setMessages(result);
          setChats((current) => current.map((chat) => (
            chat.id === activeChatId ? { ...chat, unreadCount: 0 } : chat
          )));
          setError('');
        }
      } catch (loadError) {
        if (isMounted) setError(loadError.message || 'Could not load this conversation.');
      }
    };
    loadMessages();
    const intervalId = isRealtimeConnected ? null : window.setInterval(loadMessages, 5000);
    return () => {
      isMounted = false;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [activeChatId, isRealtimeConnected]);

  useEffect(() => {
    if (!session?.token) return undefined;

    let isMounted = true;
    const socket = io(SOCKET_ORIGIN, { auth: { token: session.token } });
    socket.on('connect', () => {
      if (isMounted) setRealtimeStatus('connected');
    });
    socket.on('disconnect', () => {
      if (isMounted) setRealtimeStatus('fallback');
    });
    socket.on('connect_error', () => {
      if (isMounted) setRealtimeStatus('fallback');
    });
    socket.on('chat:new-message', (event) => {
      if (!isMounted) return;
      const { conversationId, message } = event || {};
      if (typeof conversationId !== 'string' || typeof message?.id !== 'string') return;

      if (activeChatIdRef.current === conversationId) {
        setMessages((current) => (
          current.some((existing) => String(existing.id) === message.id)
            ? current
            : [...current, message]
        ));
        getChatMessages(conversationId)
          .then((result) => {
            if (!isMounted) return undefined;
            if (activeChatIdRef.current === conversationId) setMessages(result);
            return refreshChats();
          })
          .catch((loadError) => {
            if (isMounted) setError(loadError.message || 'Could not refresh this conversation.');
          });
        return;
      }

      refreshChats().catch((loadError) => {
        if (isMounted) setError(loadError.message || 'The inbox could not be refreshed yet.');
      });
    });

    return () => {
      isMounted = false;
      socket.disconnect();
    };
  }, [refreshChats, session?.token]);

  useEffect(() => {
    if (!activeChatId || activeChat?.listingType !== 'property' || !isTenant) {
      contactRequestVersionRef.current += 1;
      visitRequestVersionRef.current += 1;
      setContactRequest(null);
      setContactRequestError('');
      setOwnerContact(null);
      setOwnerContactError('');
      setVisitRequest(null);
      setVisitRequestError('');
      return undefined;
    }

    let isMounted = true;
    const contactRequestVersion = contactRequestVersionRef.current + 1;
    const visitRequestVersion = visitRequestVersionRef.current + 1;
    contactRequestVersionRef.current = contactRequestVersion;
    visitRequestVersionRef.current = visitRequestVersion;
    setContactRequest(null);
    setContactRequestError('');
    setOwnerContact(null);
    setOwnerContactError('');
    getMyContactRequest(activeChat.listingId)
      .then((request) => {
        if (isMounted && contactRequestVersionRef.current === contactRequestVersion) {
          setContactRequest(request);
        }
      })
      .catch((loadError) => {
        if (isMounted && contactRequestVersionRef.current === contactRequestVersion) {
          setContactRequestError(loadError.message || 'Could not load your contact request.');
        }
      });
    setVisitRequest(null);
    setVisitRequestError('');
    getMyVisitRequest(activeChat.listingId)
      .then((request) => {
        if (isMounted && visitRequestVersionRef.current === visitRequestVersion) {
          setVisitRequest(request);
        }
      })
      .catch((loadError) => {
        if (isMounted && visitRequestVersionRef.current === visitRequestVersion) {
          setVisitRequestError(loadError.message || 'Could not load your visit request.');
        }
      });
    return () => {
      isMounted = false;
    };
  }, [activeChatId, activeChat?.listingId, activeChat?.listingType, isTenant]);

  useEffect(() => {
    if (!activeChatId
      || activeChat?.listingType !== 'property'
      || !isTenant
      || contactRequest?.status !== 'accepted') {
      setOwnerContact(null);
      setOwnerContactError('');
      setIsLoadingOwnerContact(false);
      return undefined;
    }

    let isMounted = true;
    setIsLoadingOwnerContact(true);
    getOwnerContactDetails(activeChat.listingId)
      .then((details) => {
        if (isMounted) setOwnerContact(details);
      })
      .catch((loadError) => {
        if (isMounted) {
          setOwnerContactError(loadError.message || 'Could not load owner contact details.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingOwnerContact(false);
      });
    return () => {
      isMounted = false;
    };
  }, [
    activeChatId,
    activeChat?.listingId,
    activeChat?.listingType,
    contactRequest?.status,
    isTenant,
  ]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const handleSend = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!activeChat || !text) return;
    setIsSending(true);
    setError('');
    try {
      const message = await sendChatMessage(activeChat.id, text);
      setMessages((current) => (
        current.some((existing) => String(existing.id) === String(message.id))
          ? current
          : [...current, message]
      ));
      setDraft('');
      setChats((current) => current.map((chat) => (
        chat.id === activeChat.id
          ? { ...chat, lastMessage: message.text, updatedAt: message.createdAt }
          : chat
      )));
      refreshChats().catch((refreshError) => {
        setError(`Message sent. ${refreshError.message || 'The inbox could not be refreshed yet.'}`);
      });
    } catch (sendError) {
      setError(sendError.message || 'Could not send your message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVisitRequest = async (event) => {
    event.preventDefault();
    if (!activeChat || !visitDateTime) return;

    const requestVersion = visitRequestVersionRef.current + 1;
    visitRequestVersionRef.current = requestVersion;
    setIsRequestingVisit(true);
    setVisitRequestError('');
    try {
      const request = await createVisitRequest(
        activeChat.listingId,
        new Date(visitDateTime).toISOString(),
      );
      if (visitRequestVersionRef.current === requestVersion) setVisitRequest(request);
    } catch (requestError) {
      if (visitRequestVersionRef.current === requestVersion) {
        setVisitRequestError(requestError.message || 'Could not request a property visit.');
      }
    } finally {
      setIsRequestingVisit(false);
    }
  };

  const handleContactRequest = async () => {
    if (!activeChat) return;
    const requestVersion = contactRequestVersionRef.current + 1;
    contactRequestVersionRef.current = requestVersion;
    setIsRequestingContact(true);
    setContactRequestError('');
    try {
      const request = await createContactRequest(activeChat.listingId);
      if (contactRequestVersionRef.current === requestVersion) setContactRequest(request);
    } catch (requestError) {
      if (contactRequestVersionRef.current === requestVersion) {
        setContactRequestError(requestError.message || 'Could not request owner contact.');
      }
    } finally {
      setIsRequestingContact(false);
    }
  };

  const minVisitDateTime = new Date(
    Date.now() + 60000 - new Date().getTimezoneOffset() * 60000,
  ).toISOString().slice(0, 16);

  const selectChat = (chat) => {
    setSearchParams({ conversation: chat.id });
  };

  if (!session?.token) {
    return <Navigate to="/login" replace state={{ from: '/messages' }} />;
  }

  return (
    <>
      <Navbar />
      <main className="chat-page">
        <Link className="chat-back-link" to="/"><ArrowLeft aria-hidden="true" /> Back to browsing</Link>
        <header className="chat-page-heading">
          <span className="chat-eyebrow">YOUR INBOX</span>
          <h1>Messages</h1>
          <p>Chat privately with renters, owners, buyers, and sellers about their listings.</p>
        </header>
        {status === 'ready' && realtimeStatus === 'fallback' && (
          <p className="chat-realtime-status" role="status">
            Live updates are reconnecting. Messages will refresh periodically.
          </p>
        )}
        {status === 'loading' && <p className="chat-state" role="status">Loading your inbox…</p>}
        {status === 'error' && <p className="chat-error" role="alert">{error}</p>}
        {status === 'ready' && (
          <div className="chat-inbox">
            <aside className="chat-list" aria-label="Your conversations">
              <h2>Conversations <span>{chats.length}</span></h2>
              {chats.length ? chats.map((chat) => (
                <button
                  className={`chat-list-item${activeChat?.id === chat.id ? ' is-active' : ''}`}
                  type="button"
                  key={chat.id}
                  onClick={() => selectChat(chat)}
                >
                  <span className="chat-list-avatar" aria-hidden="true">
                    {(chat.otherParticipant.fullName || 'B').trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="chat-list-copy">
                    <strong>{chat.otherParticipant.fullName}</strong>
                    <small>{chat.listingTitle}</small>
                    <span>{chat.lastMessage || 'Start the conversation'}</span>
                  </span>
                  {chat.unreadCount > 0 && <span className="chat-unread">{chat.unreadCount}</span>}
                </button>
              )) : (
                <div className="chat-empty-list">
                  <MessageSquare aria-hidden="true" />
                  <strong>No messages yet</strong>
                  <p>Start a private chat from any home or marketplace listing.</p>
                </div>
              )}
            </aside>
            <section className="chat-thread" aria-label="Conversation">
              {activeChat ? (
                <>
                  <header className="chat-thread-heading">
                    <span className="chat-list-avatar" aria-hidden="true">
                      {(activeChat.otherParticipant.fullName || 'B').trim().charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <strong>{activeChat.otherParticipant.fullName}</strong>
                      <Link to={activeChat.listingType === 'property'
                        ? `/properties/${activeChat.listingId}`
                        : `/marketplace/items/${activeChat.listingId}`}
                      >
                        About: {activeChat.listingTitle}
                      </Link>
                    </div>
                  </header>
                  {activeChat.listingType === 'property' && isTenant && (
                    <section className="chat-contact-request" aria-labelledby="chat-contact-request-title">
                      <div>
                        <strong id="chat-contact-request-title">Request owner contact details</strong>
                        <p>Ask the owner to share their contact information.</p>
                      </div>
                      {contactRequest?.status === 'pending' ? (
                        <span className="chat-contact-state">Request sent · awaiting response</span>
                      ) : contactRequest?.status === 'accepted' ? (
                        <div className="chat-owner-contact">
                          <span className="chat-contact-state is-accepted">Request accepted</span>
                          {isLoadingOwnerContact && <span>Loading owner details…</span>}
                          {ownerContactError && <p className="chat-error" role="alert">{ownerContactError}</p>}
                          {ownerContact && (
                            <>
                              <strong>{ownerContact.fullName}</strong>
                              <span>{ownerContact.occupation || 'Occupation not provided'}</span>
                              {ownerContact.phone
                                ? <a href={`tel:${ownerContact.phone}`}>{ownerContact.phone}</a>
                                : <span>Phone not provided</span>}
                              {ownerContact.email
                                ? <a href={`mailto:${ownerContact.email}`}>{ownerContact.email}</a>
                                : <span>Email not provided</span>}
                            </>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isRequestingContact}
                          onClick={handleContactRequest}
                        >
                          {isRequestingContact
                            ? 'Sending…'
                            : contactRequest?.status === 'rejected'
                              ? 'Request contact again'
                              : 'Request contact'}
                        </button>
                      )}
                      {contactRequestError && <p className="chat-error" role="alert">{contactRequestError}</p>}
                    </section>
                  )}
                  {activeChat.listingType === 'property' && isTenant && (
                    <section className="chat-visit-request" aria-labelledby="chat-visit-request-title">
                      <div>
                        <strong id="chat-visit-request-title">Request a property visit</strong>
                        <p>Choose a date and time to ask the owner about a visit.</p>
                      </div>
                      {visitRequest && (
                        <div className={`chat-visit-state${visitRequest.status === 'accepted' ? ' is-accepted' : ''}`}>
                          <span>Visit {visitRequest.status}</span>
                          <time dateTime={visitRequest.visitAt}>{formatVisitTime(visitRequest.visitAt)}</time>
                        </div>
                      )}
                      {(!visitRequest || visitRequest.status === 'rejected') && (
                        <form onSubmit={handleVisitRequest}>
                          <label htmlFor="chat-visit-date-time">Requested date and time</label>
                          <input
                            id="chat-visit-date-time"
                            type="datetime-local"
                            min={minVisitDateTime}
                            value={visitDateTime}
                            onChange={(event) => setVisitDateTime(event.target.value)}
                            required
                          />
                          <button type="submit" disabled={isRequestingVisit}>
                            {isRequestingVisit
                              ? 'Sending…'
                              : visitRequest?.status === 'rejected'
                                ? 'Request another visit'
                                : 'Request visit'}
                          </button>
                        </form>
                      )}
                      {visitRequestError && <p className="chat-error" role="alert">{visitRequestError}</p>}
                    </section>
                  )}
                  <div className="chat-message-list" aria-live="polite">
                    {messages.length ? messages.map((message) => {
                      const isOwnMessage = String(message.senderId) === String(session?.id);
                      return (
                        <article className={`chat-message${isOwnMessage ? ' is-own' : ''}`} key={message.id}>
                          <p>{message.text}</p>
                          <time dateTime={message.createdAt}>{formatChatTime(message.createdAt)}</time>
                        </article>
                      );
                    }) : (
                      <p className="chat-thread-empty">Messages about this listing will show here.</p>
                    )}
                    <div ref={endOfMessagesRef} />
                  </div>
                  {error && <p className="chat-error" role="alert">{error}</p>}
                  <form className="chat-send-form" onSubmit={handleSend}>
                    <label className="chat-visually-hidden" htmlFor="chat-reply">Your message</label>
                    <textarea
                      id="chat-reply"
                      rows={2}
                      maxLength={2000}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Write a message…"
                      required
                    />
                    <button type="submit" disabled={isSending || !draft.trim()}>
                      <Send aria-hidden="true" />
                      {isSending ? 'Sending…' : 'Send'}
                    </button>
                  </form>
                </>
              ) : (
                <div className="chat-no-selection">
                  <MessageSquare aria-hidden="true" />
                  <h2>{chats.length ? 'Choose a conversation' : 'Your inbox is ready'}</h2>
                  <p>{chats.length
                    ? 'Select a chat to read messages and reply.'
                    : 'Open a home or marketplace listing and send a private message to get started.'}</p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default ChatInbox;
