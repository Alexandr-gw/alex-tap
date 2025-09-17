import { Test } from '@nestjs/testing';
import { SlotsService } from '../../slots/slots.service';
import { PrismaService } from '@/prisma/prisma.service';

const mockPrisma = {
    worker: { findUnique: jest.fn() },
    service: { findUnique: jest.fn() },
    availabilityRule: { findMany: jest.fn() },
    availabilityException: { findMany: jest.fn() },
    job: { findMany: jest.fn() },
};

function d(s: string) { return new Date(s); }

describe('SlotsService', () => {
    let svc: SlotsService;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                SlotsService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();
        svc = module.get(SlotsService);

        jest.resetAllMocks();

        mockPrisma.worker.findUnique.mockResolvedValue({
            id: 'wrk1',
            active: true,
            companyId: 'co1',
            company: { timezone: 'America/Edmonton' },
        });

        mockPrisma.service.findUnique.mockResolvedValue({
            id: 'svc1',
            active: true,
            durationMins: 60,
            bufferBeforeMins: 0,
            bufferAfterMins: 0,
        });

        mockPrisma.availabilityRule.findMany.mockResolvedValue([
            { dayOfWeek: 1, startLocalTime: '09:00', endLocalTime: '17:00' }, // Monday
        ]);

        mockPrisma.availabilityException.findMany.mockResolvedValue([]);

        mockPrisma.job.findMany.mockResolvedValue([
            // Busy 12:00-13:00 UTC (example)
            { startsAt: d('2025-09-15T12:00:00Z'), endsAt: d('2025-09-15T13:00:00Z') },
        ]);
    });

    it('returns snapped slots excluding busy windows', async () => {
        const out = await svc.getWorkerSlots({
            workerId: 'wrk1',
            serviceId: 'svc1',
            from: d('2025-09-15T00:00:00Z'),
            to: d('2025-09-16T00:00:00Z'),
        });

        expect(out.workerId).toBe('wrk1');
        expect(out.serviceId).toBe('svc1');
        expect(out.timezone).toBe('America/Edmonton');
        expect(out.slotDurationMins).toBe(60);
        expect(Array.isArray(out.slots)).toBe(true);

        // Basic sanity: ensure no slot overlaps the busy 12:00-13:00Z window
        const overlapsBusy = out.slots.some(s => !(new Date(s.end) <= d('2025-09-15T12:00:00Z') || new Date(s.start) >= d('2025-09-15T13:00:00Z')));
        expect(overlapsBusy).toBe(false);
    });
});
