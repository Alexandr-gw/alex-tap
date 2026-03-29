import { randomBytes } from 'crypto';

const DEFAULT_BOOKING_ACCESS_DAYS = 30;

export function createBookingAccessToken() {
  return randomBytes(18).toString('base64url');
}

export function getBookingAccessExpiry(now = new Date()) {
  return new Date(now.getTime() + DEFAULT_BOOKING_ACCESS_DAYS * 24 * 60 * 60 * 1000);
}

export function buildBookingAccessUrl(token: string) {
  const appPublicUrl = process.env.APP_PUBLIC_URL?.trim();
  const path = `/booking/${token}`;

  if (!appPublicUrl) {
    return path;
  }

  return `${appPublicUrl.replace(/\/$/, '')}${path}`;
}
