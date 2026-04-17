// src/utilities/tokenUtils.js
export function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ?? null; // unix timestamp in seconds
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const exp = getTokenExpiry(token);
  if (!exp) return true;
  // add 30 second buffer so we don't send a token that's about to expire
  return Date.now() / 1000 > exp - 30;
}