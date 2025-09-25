export type OpenInterval = {
    start: Date;
    end: Date;
};
export declare function mergeIntervals(intervals: OpenInterval[]): OpenInterval[];
export declare function subtractIntervals(base: OpenInterval[], blocks: OpenInterval[]): OpenInterval[];
export declare function unionIntervals(a: OpenInterval[], b: OpenInterval[]): OpenInterval[];
export declare function sameOrAfter(a: Date, b: Date): boolean;
export declare function strictlyInside(slot: OpenInterval, range: OpenInterval): boolean;
export declare function expandDailyWindows(from: Date, to: Date, tz: string, windows: Array<{
    dayOfWeek: number;
    startLocal: string;
    endLocal: string;
}>): OpenInterval[];
export declare function applyExceptions(open: OpenInterval[], tz: string, exceptions: Array<{
    type: 'closed' | 'open';
    startsAt: Date;
    endsAt: Date;
}>): OpenInterval[];
export declare function snapToSlots(open: OpenInterval[], durationMins: number, stepMins: number): OpenInterval[];
