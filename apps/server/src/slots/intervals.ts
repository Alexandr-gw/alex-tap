import { DateTime, Duration, Interval } from 'luxon';

export type OpenInterval = { start: Date; end: Date };

export function mergeIntervals(intervals: OpenInterval[]): OpenInterval[] {
    if (!intervals.length) return [];
    const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
    const result: OpenInterval[] = [];
    let cur = { ...sorted[0] };
    for (let i = 1; i < sorted.length; i++) {
        const n = sorted[i];
        if (n.start.getTime() <= cur.end.getTime()) {
            if (n.end.getTime() > cur.end.getTime()) cur.end = n.end;
        } else {
            result.push(cur);
            cur = { ...n };
        }
    }
    result.push(cur);
    return result;
}

export function subtractIntervals(base: OpenInterval[], blocks: OpenInterval[]): OpenInterval[] {
    if (!base.length || !blocks.length) return base;
    const result: OpenInterval[] = [];
    const sortedBlocks = [...blocks].sort((a, b) => a.start.getTime() - b.start.getTime());

    for (const win of base) {
        let current: OpenInterval[] = [win];
        for (const b of sortedBlocks) {
            const next: OpenInterval[] = [];
            for (const seg of current) {
                const s = seg.start.getTime();
                const e = seg.end.getTime();
                const bs = b.start.getTime();
                const be = b.end.getTime();
                if (be <= s || bs >= e) {
                    next.push(seg);
                } else {
                    if (bs > s) next.push({ start: new Date(s), end: new Date(bs) });
                    if (be < e) next.push({ start: new Date(be), end: new Date(e) });
                }
            }
            current = next;
            if (!current.length) break;
        }
        result.push(...current);
    }
    return mergeIntervals(result);
}

export function unionIntervals(a: OpenInterval[], b: OpenInterval[]): OpenInterval[] {
    return mergeIntervals([...a, ...b]);
}

export function sameOrAfter(a: Date, b: Date) {
    return a.getTime() >= b.getTime();
}

export function strictlyInside(slot: OpenInterval, range: OpenInterval) {
    return slot.start.getTime() >= range.start.getTime() && slot.end.getTime() <= range.end.getTime();
}

/**
 * Expand recurring daily windows in a timezone into absolute intervals.
 * windows: e.g., [{ dayOfWeek: 1, startLocal: "09:00", endLocal: "17:00" }]
 */
export function expandDailyWindows(
    from: Date,
    to: Date,
    tz: string,
    windows: Array<{ dayOfWeek: number; startLocal: string; endLocal: string }>,
): OpenInterval[] {
    const res: OpenInterval[] = [];
    let cur = DateTime.fromJSDate(from).setZone(tz).startOf('day');
    const end = DateTime.fromJSDate(to).setZone(tz).endOf('day');

    const byDow = new Map<number, Array<{ startLocal: string; endLocal: string }>>();
    for (const w of windows) {
        if (!byDow.has(w.dayOfWeek)) byDow.set(w.dayOfWeek, []);
        byDow.get(w.dayOfWeek)!.push({ startLocal: w.startLocal, endLocal: w.endLocal });
    }

    while (cur <= end) {
        const dow = cur.weekday % 7; // Luxon: Monday=1..Sunday=7 → map Sunday=0
        const todays = byDow.get(dow) ?? [];
        for (const tw of todays) {
            const [sh, sm] = tw.startLocal.split(':').map(Number);
            const [eh, em] = tw.endLocal.split(':').map(Number);
            const s = cur.set({ hour: sh, minute: sm, second: 0, millisecond: 0 });
            const e = cur.set({ hour: eh, minute: em, second: 0, millisecond: 0 });
            if (e > s) {
                res.push({ start: s.toUTC().toJSDate(), end: e.toUTC().toJSDate() });
            }
        }
        cur = cur.plus({ days: 1 });
    }
    return mergeIntervals(res);
}

/**
 * Apply exceptions in tz:
 * closed: subtract from open
 * open: union with open
 */
export function applyExceptions(
    open: OpenInterval[],
    tz: string,
    exceptions: Array<{ type: 'closed' | 'open'; startsAt: Date; endsAt: Date }>,
): OpenInterval[] {
    const closed = exceptions.filter(x => x.type === 'closed').map(x => ({ start: x.startsAt, end: x.endsAt }));
    const added = exceptions.filter(x => x.type === 'open').map(x => ({ start: x.startsAt, end: x.endsAt }));
    let out = subtractIntervals(open, closed);
    if (added.length) out = unionIntervals(out, added);
    return mergeIntervals(out);
}

/**
 * Snap to fixed duration on a grid step (minutes). Ensure slot fully fits inside open ranges.
 */
export function snapToSlots(
    open: OpenInterval[],
    durationMins: number,
    stepMins: number,
): OpenInterval[] {
    const res: OpenInterval[] = [];
    const durMs = durationMins * 60_000;
    const stepMs = stepMins * 60_000;

    for (const o of open) {
        const startTs = o.start.getTime();
        const endTs = o.end.getTime();
        // align first candidate to the nearest step >= start
        const alignedStart = startTs + ((stepMs - (startTs % stepMs)) % stepMs);
        for (let t = alignedStart; t + durMs <= endTs; t += stepMs) {
            res.push({ start: new Date(t), end: new Date(t + durMs) });
        }
    }
    return res;
}
