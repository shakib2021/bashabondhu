import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNotifications, markNotificationRead } from '../../utils/notificationApi';
import { getStoredUser } from '../../utils/authStorage';

function notificationHref(notification) {
  if (notification.type === 'contact-request') return '/owner/contact-requests';
  if (notification.type === 'contact-request-decision') {
    return `/properties/${notification.propertyId}#contact-request`;
  }
  const anchor = notification.replyId
    ? `reply-${notification.replyId}`
    : `comment-${notification.commentId}`;
  return `/properties/${notification.propertyId}#${anchor}`;
}

function NotificationMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(getStoredUser()?.token));
  const [loadError, setLoadError] = useState('');
  const [readError, setReadError] = useState('');
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  useEffect(() => {
    let isMounted = true;
    if (!getStoredUser()?.token) return () => { isMounted = false; };

    const loadNotifications = async () => {
      try {
        const items = await getNotifications();
        if (isMounted) {
          setNotifications(items);
          setLoadError('');
        }
      } catch (error) {
        if (isMounted) setLoadError(error.message || 'Could not load notifications.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const handleNotificationClick = (notification) => {
    setIsOpen(false);
    setReadError('');
    if (notification.isRead) return;

    setNotifications((current) => current.map((item) => (
      item._id === notification._id ? { ...item, isRead: true } : item
    )));
    markNotificationRead(notification._id).catch((error) => {
      setNotifications((current) => current.map((item) => (
        item._id === notification._id ? { ...item, isRead: false } : item
      )));
      setReadError(error.message || 'Could not mark the notification as read.');
    });
  };

  return (
    <div className="owner-notification-wrap">
      <button
        className="owner-notification-button"
        type="button"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unreadCount > 0 && <span className="owner-notification-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {isOpen && (
        <section className="owner-notification-panel" aria-label="Notifications">
          <header className="owner-notification-heading">
            <strong>Notifications</strong>
            {unreadCount > 0 && <span>{unreadCount} unread</span>}
          </header>
          {loadError ? (
            <p className="owner-notification-message" role="alert">{loadError}</p>
          ) : isLoading ? (
            <p className="owner-notification-message" role="status">Loading notifications…</p>
          ) : notifications.length === 0 ? (
            <p className="owner-notification-message">You’re all caught up.</p>
          ) : (
            <div className="owner-notification-list">
              {notifications.map((notification) => (
                <Link
                  className={`owner-notification-item${notification.isRead ? '' : ' is-unread'}`}
                  key={notification._id}
                  to={notificationHref(notification)}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className="owner-notification-item-title">{notification.title}</span>
                  <span className="owner-notification-item-message">{notification.message}</span>
                  <time dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString()}</time>
                </Link>
              ))}
            </div>
          )}
          {readError && <p className="owner-notification-error" role="alert">{readError}</p>}
        </section>
      )}
    </div>
  );
}

export default NotificationMenu;