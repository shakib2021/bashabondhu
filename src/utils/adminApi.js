import { getStoredUser } from './authStorage';
import { requestApi } from './apiClient';

function getToken() {
  const session = getStoredUser();
  if (!session?.token) {
    throw new Error('Your session has expired. Please sign in again.');
  }
  return session.token;
}

export async function getAdminSummary() {
  const result = await requestApi('/admin/summary', { token: getToken() });
  return result.summary;
}

export async function getAdminUsers() {
  const result = await requestApi('/admin/users', { token: getToken() });
  return result.users;
}

export async function updateAdminUserStatus(userId, accountStatus) {
  const result = await requestApi(`/admin/users/${encodeURIComponent(userId)}/status`, {
    method: 'PATCH',
    token: getToken(),
    body: JSON.stringify({ accountStatus }),
  });
  return result.user;
}

export async function getAdminPosts() {
  const result = await requestApi('/admin/posts', { token: getToken() });
  return result.posts;
}

export async function removeAdminPost(postId) {
  return requestApi(`/admin/posts/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
    token: getToken(),
  });
}

export async function getAdminReports() {
  const result = await requestApi('/admin/reports', { token: getToken() });
  return result.reports;
}

export async function updateAdminReport(reportId, status) {
  return requestApi(`/admin/reports/${encodeURIComponent(reportId)}`, {
    method: 'PATCH',
    token: getToken(),
    body: JSON.stringify({ status }),
  });
}
