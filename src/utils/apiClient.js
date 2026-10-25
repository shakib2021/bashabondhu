const API_BASE_URL = `${process.env.REACT_APP_API_URL || 'https://bashabondhu-29gj.vercel.app'}/api`;

export async function requestApi(path, { token, ...options } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Could not reach the backend. Make sure it is running and CORS allows this frontend origin.');
    }
    throw error;
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The backend returned an invalid response. Please try again.');
  }

  if (!result || typeof result !== 'object') {
    throw new Error('The backend returned an invalid response. Please try again.');
  }
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'The request could not be completed.');
  }

  return result;
}
