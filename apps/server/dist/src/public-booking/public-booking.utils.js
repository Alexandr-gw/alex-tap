"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBookingAccessToken = createBookingAccessToken;
exports.getBookingAccessExpiry = getBookingAccessExpiry;
exports.buildBookingAccessUrl = buildBookingAccessUrl;
const crypto_1 = require("crypto");
const DEFAULT_BOOKING_ACCESS_DAYS = 30;
function createBookingAccessToken() {
    return (0, crypto_1.randomBytes)(18).toString('base64url');
}
function getBookingAccessExpiry(now = new Date()) {
    return new Date(now.getTime() + DEFAULT_BOOKING_ACCESS_DAYS * 24 * 60 * 60 * 1000);
}
function buildBookingAccessUrl(token) {
    const appPublicUrl = process.env.APP_PUBLIC_URL?.trim();
    const path = `/booking/${token}`;
    if (!appPublicUrl) {
        return path;
    }
    return `${appPublicUrl.replace(/\/$/, '')}${path}`;
}
//# sourceMappingURL=public-booking.utils.js.map