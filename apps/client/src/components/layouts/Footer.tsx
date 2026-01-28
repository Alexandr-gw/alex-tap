// Footer.tsx
export function Footer() {
    return (
        <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto flex h-12 max-w-screen-2xl items-center justify-between px-4 text-xs text-slate-500">
                <span>© {new Date().getFullYear()} Alex-tap</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">v0.1</span>
            </div>
        </footer>
    );
}
