export function Footer() {
    return (
        <footer className="border-t border-slate-200 bg-white">
            <div className="flex h-12 w-full items-center justify-between px-4 text-xs text-slate-500">
                <span>(c) {new Date().getFullYear()} Alex-tap</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">v0.1</span>
            </div>
        </footer>
    );
}
