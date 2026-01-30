import { RouterProvider } from "react-router-dom";
import { router } from "./app/router.tsx";
import { QueryProvider } from "./components/providers/QueryProvider.tsx";
import { ThemeProvider } from "./components/providers/ThemeProvider.tsx";
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
