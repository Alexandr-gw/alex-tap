import {Link} from "react-router-dom";

export function BookingCancelPage() {
    return (
        <div className="mx-auto max-w-xl p-6">
            <h1 className="text-xl font-semibold">Payment canceled</h1>
            <p className="mt-2 text-slate-700">No worries — you can try booking again.</p>
            <div className="mt-4">
                <Link to="/" className="underline">Go home</Link>
            </div>
        </div>
    );
}