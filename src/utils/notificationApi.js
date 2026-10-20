import { getStoredUser } from './authStorage';
import { requestApi } from './apiClient';

export async function getNotifications() {
  const session = getStoredUser();
  if (!session?.token) {
    return [];
  }

  const result = await requestApi('/users/me/notifications', { token: session.token });
  if (!Array.isArray(result.notifications)) {
    throw new Error('The backend returned invalid notifications. Please try again.');
  }
  return result.notifications;
}

export async function markNotificationRead(notificationId) {
  const session = getStoredUser();
  if (!session?.token) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  const result = await requestApi(`/users/me/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: 'PUT',
    token: session.token,
  });
  return result.notification;
}