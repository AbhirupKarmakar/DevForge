import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
    // A stray lockfile in the home directory otherwise makes Next guess the wrong workspace root.
    outputFileTracingRoot: path.join(__dirname),
    // The offer-letter route reads public/logo.png at runtime to embed it in the
    // PDF; keep that file in the function bundle so it's there in production.
    // (It degrades to a drawn monogram if the file is ever missing.)
    outputFileTracingIncludes: {
        "/api/admin/offer-letter": ["./public/logo.png"],
    },
    // Short, shareable link to the 10 PR Journey workbook.
    async redirects() {
        return [{ source: "/workbook", destination: "/learn/open-source", permanent: false }];
    },
    experimental: {
        // Keep the client-side router cache for already-visited routes so going
        // back to a page is instant instead of re-rendering on the server (and
        // re-reading Firestore). 60s on dynamic pages balances snappy navigation
        // against staleness on a data-backed app.
        staleTimes: {
            dynamic: 60,
            static: 300,
        },
    },
};

export default nextConfig;
