type Props = {
    left: number;
};

export function CurrentTimeLine({ left }: Props) {
    return (
        <div
            className="pointer-events-none absolute top-0 z-10 h-full w-0 border-l-2 border-red-500"
            style={{ left: `${left}px` }}
        />
    );
}