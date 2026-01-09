
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "../components/providers/theme-provider.tsx"
import { QueryProvider } from "../components/providers/query-provider"
import { Toaster } from "../components/ui/toaster"

export const metadata: Metadata = {
    title: "Alex Tap",
    description: "Jobber-lite MVP",
}

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
        <body>
        <ThemeProvider>
            <QueryProvider>
                {children}
                <Toaster />
            </QueryProvider>
        </ThemeProvider>
        </body>
        </html>
    )
}
