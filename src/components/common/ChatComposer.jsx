import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Send } from 'lucide-react';
import { getStoredUser } from '../../utils/authStorage';
import { startChat } from '../../utils/chatApi';
import './Chat.css';

function ChatComposer({ listingType, listingId, listingTitle, recipientName, returnTo }) {
  const session = getStoredUser();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const message = text.trim();
    if (!message) return;

    setError('');
    setIsSending(true);
    try {
      const conversation = await startChat(listingType, listingId, message);
      navigate(`/messages?conversation=${encodeURIComponent(conversation.id)}`);
    } catch (requestError) {
      setError(requestError.message || 'Could not send your message.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="chat-composer" aria-labelledby={`chat-composer-${listingId}`}>
      <div className="chat-composer-heading">
        <span className="chat-icon" aria-hidden="true"><MessageSquare /></span>
        <div>
          <h2 id={`chat-composer-${listingId}`}>Message {recipientName}</h2>
          <p>Ask privately about “{listingTitle}”.</p>
        </div>
      </div>
      {session?.token ? (
        <form onSubmit={handleSubmit}>
          <label className="chat-visually-hidden" htmlFor={`chat-message-${listingId}`}>
            Your message to {recipientName}
          </label>
          <textarea
            id={`chat-message-${listingId}`}
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Hi! I’m interested in this listing…"
            required
          />
          {error && <p className="chat-error" role="alert">{error}</p>}
          <div className="chat-composer-actions">
            <span>{text.length}/2000</span>
            <button type="submit" disabled={isSending || !text.trim()}>
              <Send aria-hidden="true" />
              {isSending ? 'Sending…' : 'Send message'}
            </button>
          </div>
        </form>
      ) : (
        <p className="chat-signin-prompt">
          <Link to="/login" state={{ from: returnTo }}>Sign in</Link> to start a private chat.
        </p>
      )}
    </section>
  );
}

export default ChatComposer;
