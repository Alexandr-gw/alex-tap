export function Footer() {
    return (
        <footer className="border-t border-emerald-100/80 bg-white/90 backdrop-blur">
            <div className="flex h-12 w-full items-center justify-between px-4 text-xs text-slate-500">
                <span>(c) {new Date().getFullYear()} Alex-tap</span>
                <span className="rounded-full border border-sky-100 bg-[linear-gradient(135deg,#effcf5_0%,#eef7ff_100%)] px-2 py-0.5 font-semibold text-slate-700">
                    v0.1
                </span>
            </div>
        </footer>
    );
}
