const securityHeaders = [
    { key: "Content-Security-Policy", value: [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "img-src 'self' data: blob:",
            "font-src 'self' data:",
            "style-src 'self' 'unsafe-inline' 'report-sample'",
            "script-src 'self' 'report-sample'",
            "connect-src 'self' http://localhost:4000 https://*.sentry.io",
            "worker-src 'self' blob:",
        ].join("; ") },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
];

const nextConfig = {
    async headers() { return [{ source: "/:path*", headers: securityHeaders }]; },
};
export default nextConfig;
