import { ForbiddenException } from '@nestjs/common';
import { buildBriefingSummary, DashboardService } from '../dashboard.service';

describe('DashboardService', () => {
  const originalEnv = process.env;
  const fetchMock = jest.fn();
  const prisma = {
    membership: {
      findFirst: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
    },
    job: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    jobLineItem: {
      findMany: jest.fn(),
    },
  };

  const makeService = () => new DashboardService(prisma as any);

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-02T18:30:00.000Z'));
    process.env = { ...originalEnv };
    (global as any).fetch = fetchMock;

    prisma.membership.findFirst.mockResolvedValue({ id: 'membership_1' });
    prisma.company.findUnique.mockResolvedValue({ timezone: 'UTC' });
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
  });

  afterAll(() => {
    delete (global as any).fetch;
  });

  it('builds a calm rules-based summary when no urgent issues exist', () => {
    const result = buildBriefingSummary({
      today: {
        total: 3,
        completed: 3,
        pending: 0,
      },
      risks: {
        lateJobs: 0,
        unpaid: 0,
        jobsNeedingConfirmation: 0,
      },
      capacity: {
        unassignedJobsCount: 0,
        overloaded: [],
      },
      trends: {
        topService: 'Move-out Cleaning',
        peakBookingWindow: '8:00-10:00 AM',
      },
    });

    expect(result).toEqual({
      summary: 'Today has 3 scheduled jobs. No urgent issues are standing out right now.',
      alerts: [],
      insights: [
        'Most requested service this week: Move-out Cleaning.',
        'Peak booking time: 8:00-10:00 AM.',
      ],
    });
  });

  it('rejects users who do not have manager access', async () => {
    const service = makeService();

    await expect(
      service.getBriefing({
        companyId: 'company_1',
        userSub: 'sub_1',
        roles: ['worker'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects manager-role users who do not belong to the company', async () => {
    const service = makeService();
    prisma.membership.findFirst.mockResolvedValue(null);

    await expect(
      service.getBriefing({
        companyId: 'company_1',
        userSub: 'sub_1',
        roles: ['manager'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('computes briefing facts from prisma queries and caches the rules response', async () => {
    const service = makeService();

    prisma.job.findMany
      .mockResolvedValueOnce([
        {
          id: 'job_done',
          status: 'DONE',
          startAt: new Date('2026-04-02T09:00:00.000Z'),
          endAt: new Date('2026-04-02T10:00:00.000Z'),
          workerId: 'worker_1',
          assignments: [],
        },
        {
          id: 'job_late',
          status: 'SCHEDULED',
          startAt: new Date('2026-04-02T11:00:00.000Z'),
          endAt: new Date('2026-04-02T12:00:00.000Z'),
          workerId: null,
          assignments: [],
        },
        {
          id: 'job_active',
          status: 'IN_PROGRESS',
          startAt: new Date('2026-04-02T13:00:00.000Z'),
          endAt: new Date('2026-04-02T19:00:00.000Z'),
          workerId: null,
          assignments: [{ workerId: 'worker_2' }],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'capacity_1',
          startAt: new Date('2026-04-02T08:00:00.000Z'),
          endAt: new Date('2026-04-02T17:30:00.000Z'),
          worker: {
            id: 'worker_1',
            displayName: 'Lena Lawn',
          },
          assignments: [
            {
              worker: {
                id: 'worker_1',
                displayName: 'Lena Lawn',
              },
            },
          ],
        },
        {
          id: 'capacity_2',
          startAt: new Date('2026-04-03T09:00:00.000Z'),
          endAt: new Date('2026-04-03T11:00:00.000Z'),
          worker: {
            id: 'worker_2',
            displayName: 'Gus Gutter',
          },
          assignments: [],
        },
      ]);
    prisma.job.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    prisma.jobLineItem.findMany.mockResolvedValue([
      {
        description: 'Deep Clean',
        job: {
          startAt: new Date('2026-04-02T09:15:00.000Z'),
        },
      },
      {
        description: 'Deep Clean',
        job: {
          startAt: new Date('2026-04-02T09:45:00.000Z'),
        },
      },
      {
        description: 'Window Wash',
        job: {
          startAt: new Date('2026-04-02T13:00:00.000Z'),
        },
      },
    ]);

    const first = await service.getBriefing({
      companyId: 'company_1',
      userSub: 'sub_1',
      roles: ['manager'],
    });
    const second = await service.getBriefing({
      companyId: 'company_1',
      userSub: 'sub_1',
      roles: ['manager'],
    });

    expect(first.source).toBe('RULES');
    expect(first.usedFallback).toBe(false);
    expect(first.facts).toEqual({
      today: {
        total: 3,
        completed: 1,
        pending: 2,
      },
      risks: {
        lateJobs: 1,
        unpaid: 1,
        jobsNeedingConfirmation: 2,
      },
      capacity: {
        unassignedJobsCount: 1,
        overloaded: [
          {
            worker: 'Lena Lawn',
            day: 'Thursday',
            jobs: 1,
            scheduledMinutes: 570,
          },
        ],
      },
      trends: {
        topService: 'Deep Clean',
        peakBookingWindow: expect.stringMatching(/8:00.*10:00 AM/),
      },
    });
    expect(first.briefing.summary).toContain('Today has 3 scheduled jobs');
    expect(first.briefing.alerts[0]).toContain('Pending confirmation: 2 jobs still need review.');
    expect(first.briefing.alerts[1]).toContain('Lena Lawn is overloaded on Thursday');
    expect(first.briefing.alerts[2]).toContain('jobs have been unpaid');
    expect(first.briefing.insights).toEqual([
      'Most requested service this week: Deep Clean.',
      expect.stringMatching(/Peak booking time: 8:00.*10:00 AM\./),
    ]);
    expect(second).toEqual(first);
    expect(prisma.job.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.job.count).toHaveBeenCalledTimes(2);
    expect(prisma.jobLineItem.findMany).toHaveBeenCalledTimes(1);
  });

  it('formats the briefing with AI when the feature is enabled', async () => {
    const service = makeService();

    process.env.AI_BRIEFING_ENABLED = 'true';
    process.env.OPENAI_API_KEY = 'openai_key';
    process.env.AI_BRIEFING_MODEL = 'gpt-test';

    prisma.job.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prisma.job.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prisma.jobLineItem.findMany.mockResolvedValue([]);
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        output_text: JSON.stringify({
          summary: 'AI summary',
          alerts: ['A1', 'A2', 'A3', 'A4'],
          insights: ['I1', 'I2', 'I3'],
        }),
      }),
    });

    const result = await service.getBriefing({
      companyId: 'company_1',
      userSub: 'sub_1',
      roles: ['admin'],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer openai_key',
          'content-type': 'application/json',
        }),
      }),
    );
    expect(result.source).toBe('AI');
    expect(result.usedFallback).toBe(false);
    expect(result.briefing).toEqual({
      summary: 'AI summary',
      alerts: ['A1', 'A2', 'A3'],
      insights: ['I1', 'I2'],
    });
  });

  it('falls back to rules when AI formatting fails', async () => {
    const service = makeService();

    process.env.AI_BRIEFING_ENABLED = 'true';
    process.env.OPENAI_API_KEY = 'openai_key';

    prisma.job.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prisma.job.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prisma.jobLineItem.findMany.mockResolvedValue([]);
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        output_text: JSON.stringify({
          summary: 42,
          alerts: [],
          insights: [],
        }),
      }),
    });

    const result = await service.getBriefing({
      companyId: 'company_1',
      userSub: 'sub_1',
      roles: ['manager'],
    });

    expect(result.source).toBe('RULES');
    expect(result.usedFallback).toBe(true);
    expect(result.briefing.summary).toContain('No urgent issues are standing out right now.');
  });

  it('uses default timeout and cache ttl values when env vars are invalid', () => {
    const service = makeService();

    process.env.AI_BRIEFING_CACHE_TTL_MS = '0';
    process.env.AI_BRIEFING_TIMEOUT_MS = '-50';
    process.env.AI_BRIEFING_ENABLED = 'true';
    delete process.env.OPENAI_API_KEY;

    expect((service as any).getCacheTtlMs()).toBe(300000);
    expect((service as any).getTimeoutMs()).toBe(6000);
    expect((service as any).isAiEnabled()).toBe(false);
    expect((service as any).computeTopService([
      { description: '  ' },
      { description: 'Move-out' },
      { description: 'Move-out' },
    ])).toBe('Move-out');
    expect((service as any).computePeakWindow([], 'UTC')).toBeNull();
    expect((service as any).computeOverloadedWorkers([], 'UTC')).toEqual([]);
  });
});
