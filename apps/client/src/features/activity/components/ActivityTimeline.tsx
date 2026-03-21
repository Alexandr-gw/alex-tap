import type { ActivityItem } from "../api/activity.types";
import { ActivityTimelineItem } from "./ActivityTimelineItem";

type Props = {
    items: ActivityItem[];
};

export function ActivityTimeline({ items }: Props) {
    if (items.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">No activity yet.</p>
            </div>
        );
    }

    return (
        <div>
            {items.map((item, index) => (
                <ActivityTimelineItem
                    key={item.id}
                    item={item}
                    isLast={index === items.length - 1}
                />
            ))}
        </div>
    );
}