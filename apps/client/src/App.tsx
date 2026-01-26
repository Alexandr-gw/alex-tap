import { RouterProvider } from "react-router-dom";
import { router } from "./app/router.tsx";
import { QueryProvider } from "./components/providers/query-provider";
import { ThemeProvider } from "./components/providers/theme-provider";
import { Toaster } from "./components/ui/toaster";

export default function App() {
    return (
        <ThemeProvider>
            <QueryProvider>
                <RouterProvider router={router} />
                <Toaster />
            </QueryProvider>
        </ThemeProvider>
    );
}
