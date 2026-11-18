import { getStoredUser } from './authStorage';
import { requestApi } from './apiClient';

function getSession() {
  const session = getStoredUser();
  if (!session?.token) {
    throw new Error('Sign in to use chat.');
  }
  return session;
}

export async function startChat(listingType, listingId, text) {
  const session = getSession();
  const result = await requestApi('/chats/start', {
    method: 'POST',
    token: session.token,
    body: JSON.stringify({ listingType, listingId, text }),
  });
  return result.conversation;
}

export async function getMyChats() {
  const session = getSession();
  const result = await requestApi('/chats', { token: session.token });
  if (!Array.isArray(result.chats)) {
    throw new Error('The backend returned an invalid chat list.');
  }
  return result.chats;
}

export async function getChatMessages(conversationId) {
  const session = getSession();
  const result = await requestApi(`/chats/${encodeURIComponent(conversationId)}/messages`, {
    token: session.token,
  });
  if (!Array.isArray(result.messages)) {
    throw new Error('The backend returned invalid chat messages.');
  }
  return result.messages;
}

export async function sendChatMessage(conversationId, text) {
  const session = getSession();
  const result = await requestApi(`/chats/${encodeURIComponent(conversationId)}/messages`, {
    method: 'POST',
    token: session.token,
    body: JSON.stringify({ text }),
  });
  return result.message;
}
