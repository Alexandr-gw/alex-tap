// src/app/providers/QueryProvider.tsx
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: 1,
                refetchOnWindowFocus: false,
            },
            mutations: {
                retry: 0,
            },
        },
    });
}

// In Vite (client-only), this ensures a single instance for the whole app lifetime.
let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const client = React.useMemo(() => getQueryClient(), []);
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
