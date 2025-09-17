import { mergeIntervals, subtractIntervals, unionIntervals, snapToSlots } from '../../slots/intervals';

function d(s: string) { return new Date(s); }

describe('interval algebra', () => {
    test('mergeIntervals merges overlaps and touches', () => {
        const out = mergeIntervals([
            { start: d('2025-09-01T10:00:00Z'), end: d('2025-09-01T11:00:00Z') },
            { start: d('2025-09-01T10:30:00Z'), end: d('2025-09-01T12:00:00Z') },
            { start: d('2025-09-01T12:00:00Z'), end: d('2025-09-01T13:00:00Z') },
        ]);
        expect(out).toEqual([{ start: d('2025-09-01T10:00:00Z'), end: d('2025-09-01T13:00:00Z') }]);
    });

    test('subtractIntervals handles contained block', () => {
        const base = [{ start: d('2025-09-01T10:00:00Z'), end: d('2025-09-01T13:00:00Z') }];
        const blocks = [{ start: d('2025-09-01T11:00:00Z'), end: d('2025-09-01T12:00:00Z') }];
        const out = subtractIntervals(base, blocks);
        expect(out).toEqual([
            { start: d('2025-09-01T10:00:00Z'), end: d('2025-09-01T11:00:00Z') },
            { start: d('2025-09-01T12:00:00Z'), end: d('2025-09-01T13:00:00Z') },
        ]);
    });

    test('subtractIntervals exact touch keeps available edges', () => {
        const base = [{ start: d('2025-09-01T10:00:00Z'), end: d('2025-09-01T12:00:00Z') }];
        const blocks = [{ start: d('2025-09-01T12:00:00Z'), end: d('2025-09-01T13:00:00Z') }];
        const out = subtractIntervals(base, blocks);
        expect(out).toEqual([{ start: d('2025-09-01T10:00:00Z'), end: d('2025-09-01T12:00:00Z') }]);
    });

    test('unionIntervals', () => {
        const out = unionIntervals(
            [{ start: d('2025-09-01T10:00:00Z'), end: d('2025-09-01T11:00:00Z') }],
            [{ start: d('2025-09-01T10:30:00Z'), end: d('2025-09-01T12:00:00Z') }],
        );
        expect(out).toEqual([{ start: d('2025-09-01T10:00:00Z'), end: d('2025-09-01T12:00:00Z') }]);
    });

    test('snapToSlots yields contained slots on grid', () => {
        const open = [{ start: d('2025-09-01T10:00:00Z'), end: d('2025-09-01T11:00:00Z') }];
        const out = snapToSlots(open, 30, 15);
        expect(out.map(x => x.start.toISOString())).toEqual([
            '2025-09-01T10:00:00.000Z',
            '2025-09-01T10:15:00.000Z',
            '2025-09-01T10:30:00.000Z',
        ]);
    });
});
