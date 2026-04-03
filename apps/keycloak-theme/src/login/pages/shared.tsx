export function Brand(props: { name: string }) {
    const { name } = props;
    const normalizedName = name
        .replace(/\s+local$/i, "")
        .replace(/\s+staging$/i, "")
        .replace(/\s+production$/i, "")
        .trim();

    return (
        <div className="alex-tap-brand">
            <span className="alex-tap-brand-text">{normalizedName}</span>
        </div>
    );
}
