"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeIntervals = mergeIntervals;
exports.subtractIntervals = subtractIntervals;
exports.unionIntervals = unionIntervals;
exports.sameOrAfter = sameOrAfter;
exports.strictlyInside = strictlyInside;
exports.expandDailyWindows = expandDailyWindows;
exports.applyExceptions = applyExceptions;
exports.snapToSlots = snapToSlots;
const luxon_1 = require("luxon");
function mergeIntervals(intervals) {
    if (!intervals.length)
        return [];
    const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
    const result = [];
    let cur = { ...sorted[0] };
    for (let i = 1; i < sorted.length; i++) {
        const n = sorted[i];
        if (n.start.getTime() <= cur.end.getTime()) {
            if (n.end.getTime() > cur.end.getTime())
                cur.end = n.end;
        }
        else {
            result.push(cur);
            cur = { ...n };
        }
    }
    result.push(cur);
    return result;
}
function subtractIntervals(base, blocks) {
    if (!base.length || !blocks.length)
        return base;
    const result = [];
    const sortedBlocks = [...blocks].sort((a, b) => a.start.getTime() - b.start.getTime());
    for (const win of base) {
        let current = [win];
        for (const b of sortedBlocks) {
            const next = [];
            for (const seg of current) {
                const s = seg.start.getTime();
                const e = seg.end.getTime();
                const bs = b.start.getTime();
                const be = b.end.getTime();
                if (be <= s || bs >= e) {
                    next.push(seg);
                }
                else {
                    if (bs > s)
                        next.push({ start: new Date(s), end: new Date(bs) });
                    if (be < e)
                        next.push({ start: new Date(be), end: new Date(e) });
                }
            }
            current = next;
            if (!current.length)
                break;
        }
        result.push(...current);
    }
    return mergeIntervals(result);
}
function unionIntervals(a, b) {
    return mergeIntervals([...a, ...b]);
}
function sameOrAfter(a, b) {
    return a.getTime() >= b.getTime();
}
function strictlyInside(slot, range) {
    return slot.start.getTime() >= range.start.getTime() && slot.end.getTime() <= range.end.getTime();
}
function expandDailyWindows(from, to, tz, windows) {
    const res = [];
    let cur = luxon_1.DateTime.fromJSDate(from).setZone(tz).startOf('day');
    const end = luxon_1.DateTime.fromJSDate(to).setZone(tz).endOf('day');
    const byDow = new Map();
    for (const w of windows) {
        if (!byDow.has(w.dayOfWeek))
            byDow.set(w.dayOfWeek, []);
        byDow.get(w.dayOfWeek).push({ startLocal: w.startLocal, endLocal: w.endLocal });
    }
    while (cur <= end) {
        const dow = cur.weekday % 7;
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
function applyExceptions(open, tz, exceptions) {
    const closed = exceptions.filter(x => x.type === 'closed').map(x => ({ start: x.startsAt, end: x.endsAt }));
    const added = exceptions.filter(x => x.type === 'open').map(x => ({ start: x.startsAt, end: x.endsAt }));
    let out = subtractIntervals(open, closed);
    if (added.length)
        out = unionIntervals(out, added);
    return mergeIntervals(out);
}
function snapToSlots(open, durationMins, stepMins) {
    const res = [];
    const durMs = durationMins * 60_000;
    const stepMs = stepMins * 60_000;
    for (const o of open) {
        const startTs = o.start.getTime();
        const endTs = o.end.getTime();
        const alignedStart = startTs + ((stepMs - (startTs % stepMs)) % stepMs);
        for (let t = alignedStart; t + durMs <= endTs; t += stepMs) {
            res.push({ start: new Date(t), end: new Date(t + durMs) });
        }
    }
    return res;
}
//# sourceMappingURL=intervals.js.map