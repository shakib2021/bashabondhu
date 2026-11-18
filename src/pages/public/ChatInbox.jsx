import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { getStoredUser } from '../../utils/authStorage';
import { getChatMessages, getMyChats, sendChatMessage } from '../../utils/chatApi';
import '../../components/common/Chat.css';

function formatChatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Recently'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function ChatInbox() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const endOfMessagesRef = useRef(null);
  const session = getStoredUser();
  const requestedConversationId = searchParams.get('conversation');
  const activeChat = chats.find((chat) => chat.id === requestedConversationId) || null;
  const activeChatId = activeChat?.id;

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
        if (!selectedId && results.length) {
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
    const intervalId = window.setInterval(loadChats, 15000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [searchParams, setSearchParams]);

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
    const intervalId = window.setInterval(loadMessages, 5000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [activeChatId]);

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
      setMessages((current) => [...current, message]);
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
