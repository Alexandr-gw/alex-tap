"use client"

import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

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
    })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
    if (typeof window === "undefined") return makeQueryClient()
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const client = getQueryClient()
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
