import { ForbiddenException, Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '@/prisma/prisma.service';
import { hasAnyRole } from '@/common/utils/roles.util';
import type {
  BriefingContent,
  BriefingFacts,
  DashboardBriefingResponseDto,
} from './dashboard.types';

type BriefingCacheEntry = {
  expiresAt: number;
  value: DashboardBriefingResponseDto;
};

type OpenAiBriefingResponse = {
  summary: string;
  alerts: string[];
  insights: string[];
};

const UNPAID_AGE_DAYS = 5;
const OVERLOAD_MINUTES_THRESHOLD = 8 * 60;
const OVERLOAD_JOB_COUNT_THRESHOLD = 6;

@Injectable()
export class DashboardService {
  private readonly cache = new Map<string, BriefingCacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  async getBriefing(input: {
    companyId: string;
    userSub: string | null;
    roles: string[];
  }): Promise<DashboardBriefingResponseDto> {
    await this.requireManager(input.companyId, input.roles, input.userSub);

    const useAi = this.isAiEnabled();
    const cacheKey = `${input.companyId}:${useAi ? 'ai' : 'rules'}`;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const facts = await this.computeFacts(input.companyId);
    const rulesBriefing = buildBriefingSummary(facts);
    let briefing = rulesBriefing;
    let source: DashboardBriefingResponseDto['source'] = 'RULES';
    let usedFallback = false;

    if (useAi) {
      try {
        briefing = await this.callAiFormatter(facts);
        source = 'AI';
      } catch {
        briefing = rulesBriefing;
        source = 'RULES';
        usedFallback = true;
      }
    }

    const response: DashboardBriefingResponseDto = {
      facts,
      briefing,
      source,
      usedFallback,
      generatedAt: new Date().toISOString(),
    };

    this.cache.set(cacheKey, {
      expiresAt: now + this.getCacheTtlMs(),
      value: response,
    });

    return response;
  }

  private async computeFacts(companyId: string): Promise<BriefingFacts> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { timezone: true },
    });

    const timezone = company?.timezone ?? 'America/Edmonton';
    const now = DateTime.now().setZone(timezone);
    const todayStart = now.startOf('day').toUTC().toJSDate();
    const todayEnd = now.endOf('day').toUTC().toJSDate();
    const weekStart = now.startOf('week').toUTC().toJSDate();
    const weekEnd = now.endOf('week').toUTC().toJSDate();
    const nextWeekEnd = now.plus({ days: 6 }).endOf('day').toUTC().toJSDate();
    const unpaidBefore = now.minus({ days: UNPAID_AGE_DAYS }).toUTC().toJSDate();

    const [
      todayJobs,
      confirmationJobs,
      overdueUnpaidJobs,
      weekJobsForCapacity,
      weekServiceItems,
    ] = await Promise.all([
      this.prisma.job.findMany({
        where: {
          companyId,
          deletedAt: null,
          startAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        select: {
          id: true,
          status: true,
          endAt: true,
          startAt: true,
          workerId: true,
          assignments: {
            select: {
              workerId: true,
            },
          },
        },
      }),
      this.prisma.job.count({
        where: {
          companyId,
          deletedAt: null,
          status: 'PENDING_CONFIRMATION',
          startAt: {
            gte: todayStart,
            lte: nextWeekEnd,
          },
        },
      }),
      this.prisma.job.count({
        where: {
          companyId,
          deletedAt: null,
          balanceCents: { gt: 0 },
          startAt: { lt: unpaidBefore },
          status: { notIn: ['CANCELED'] },
        },
      }),
      this.prisma.job.findMany({
        where: {
          companyId,
          deletedAt: null,
          startAt: {
            gte: todayStart,
            lte: nextWeekEnd,
          },
          status: { notIn: ['CANCELED', 'DONE', 'NO_SHOW'] },
        },
        select: {
          id: true,
          startAt: true,
          endAt: true,
          worker: {
            select: {
              id: true,
              displayName: true,
            },
          },
          assignments: {
            select: {
              worker: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.jobLineItem.findMany({
        where: {
          job: {
            companyId,
            deletedAt: null,
            startAt: {
              gte: weekStart,
              lte: weekEnd,
            },
            status: { notIn: ['CANCELED', 'NO_SHOW'] },
          },
        },
        select: {
          description: true,
          job: {
            select: {
              startAt: true,
            },
          },
        },
      }),
    ]);

    const totalToday = todayJobs.length;
    const completedToday = todayJobs.filter((job) => job.status === 'DONE').length;
    const pendingToday = todayJobs.filter((job) =>
      !['DONE', 'CANCELED', 'NO_SHOW'].includes(job.status),
    ).length;
    const lateJobs = todayJobs.filter((job) =>
      !['DONE', 'CANCELED', 'NO_SHOW'].includes(job.status) &&
      job.endAt.getTime() < Date.now(),
    ).length;
    const unassignedJobsCount = todayJobs.filter((job) => {
      const assignedIds = new Set([
        ...(job.workerId ? [job.workerId] : []),
        ...job.assignments.map((assignment) => assignment.workerId),
      ]);
      return assignedIds.size === 0;
    }).length;

    const overloaded = this.computeOverloadedWorkers(weekJobsForCapacity, timezone);
    const topService = this.computeTopService(weekServiceItems);
    const peakBookingWindow = this.computePeakWindow(weekServiceItems, timezone);

    return {
      today: {
        total: totalToday,
        completed: completedToday,
        pending: pendingToday,
      },
      risks: {
        lateJobs,
        unpaid: overdueUnpaidJobs,
        jobsNeedingConfirmation: confirmationJobs,
      },
      capacity: {
        unassignedJobsCount,
        overloaded,
      },
      trends: {
        topService,
        peakBookingWindow,
      },
    };
  }

  private computeOverloadedWorkers(
    jobs: Array<{
      id: string;
      startAt: Date;
      endAt: Date;
      worker: { id: string; displayName: string } | null;
      assignments: Array<{ worker: { id: string; displayName: string } | null }>;
    }>,
    timezone: string,
  ) {
    const buckets = new Map<string, {
      worker: string;
      day: string;
      jobs: number;
      scheduledMinutes: number;
    }>();

    for (const job of jobs) {
      const workers = [
        ...(job.worker ? [job.worker] : []),
        ...job.assignments
          .map((assignment) => assignment.worker)
          .filter((worker): worker is { id: string; displayName: string } => Boolean(worker)),
      ];

      const uniqueWorkers = new Map(workers.map((worker) => [worker.id, worker]));
      const scheduledMinutes = Math.max(
        0,
        Math.round((job.endAt.getTime() - job.startAt.getTime()) / 60000),
      );
      const localDay = DateTime.fromJSDate(job.startAt, { zone: 'utc' })
        .setZone(timezone)
        .toFormat('cccc');

      for (const worker of uniqueWorkers.values()) {
        const key = `${worker.id}:${localDay}`;
        const current = buckets.get(key) ?? {
          worker: worker.displayName,
          day: localDay,
          jobs: 0,
          scheduledMinutes: 0,
        };

        current.jobs += 1;
        current.scheduledMinutes += scheduledMinutes;
        buckets.set(key, current);
      }
    }

    return [...buckets.values()]
      .filter((item) =>
        item.scheduledMinutes > OVERLOAD_MINUTES_THRESHOLD ||
        item.jobs >= OVERLOAD_JOB_COUNT_THRESHOLD,
      )
      .sort((left, right) => {
        if (right.scheduledMinutes !== left.scheduledMinutes) {
          return right.scheduledMinutes - left.scheduledMinutes;
        }
        return right.jobs - left.jobs;
      })
      .slice(0, 3);
  }

  private computeTopService(items: Array<{ description: string }>) {
    const counts = new Map<string, number>();

    for (const item of items) {
      const name = item.description?.trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
  }

  private computePeakWindow(
    items: Array<{ job: { startAt: Date } }>,
    timezone: string,
  ) {
    const counts = new Map<number, number>();

    for (const item of items) {
      const hour = DateTime.fromJSDate(item.job.startAt, { zone: 'utc' })
        .setZone(timezone)
        .hour;
      const bucket =
        hour < 10 ? 8 :
        hour < 12 ? 10 :
        hour < 14 ? 12 :
        14;
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    }

    const topBucket = [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
    if (typeof topBucket !== 'number') {
      return null;
    }

    const start = DateTime.fromObject({ hour: topBucket, minute: 0 });
    const end = start.plus({ hours: 2 });
    return `${start.toFormat('h:mm')}–${end.toFormat('h:mm a')}`;
  }

  private isAiEnabled() {
    return process.env.AI_BRIEFING_ENABLED?.trim().toLowerCase() === 'true' &&
      Boolean(process.env.OPENAI_API_KEY?.trim());
  }

  private getCacheTtlMs() {
    const raw = Number(process.env.AI_BRIEFING_CACHE_TTL_MS ?? '300000');
    return Number.isFinite(raw) && raw > 0 ? raw : 300000;
  }

  private getTimeoutMs() {
    const raw = Number(process.env.AI_BRIEFING_TIMEOUT_MS ?? '6000');
    return Number.isFinite(raw) && raw > 0 ? raw : 6000;
  }

  private async callAiFormatter(facts: BriefingFacts): Promise<BriefingContent> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY missing');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.getTimeoutMs());

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: process.env.AI_BRIEFING_MODEL?.trim() || 'gpt-5-mini',
          input: [
            {
              role: 'system',
              content: [
                {
                  type: 'input_text',
                  text: [
                    'You are an operations assistant.',
                    'Summarize key issues, highlight priorities, and suggest simple actions.',
                    'Use only the provided data.',
                    'Do not invent details.',
                    'Be concise.',
                    'Return at most 3 alerts and at most 2 insights.',
                  ].join(' '),
                },
              ],
            },
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: JSON.stringify(facts),
                },
              ],
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'operations_briefing',
              strict: true,
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  summary: { type: 'string' },
                  alerts: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  insights: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
                required: ['summary', 'alerts', 'insights'],
              },
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI briefing request failed: ${response.status}`);
      }

      const json = await response.json() as { output_text?: string };
      const parsed = json.output_text
        ? JSON.parse(json.output_text) as OpenAiBriefingResponse
        : null;

      if (
        !parsed ||
        typeof parsed.summary !== 'string' ||
        !Array.isArray(parsed.alerts) ||
        !Array.isArray(parsed.insights)
      ) {
        throw new Error('Invalid OpenAI briefing payload');
      }

      return {
        summary: parsed.summary.trim(),
        alerts: parsed.alerts.map((item) => String(item).trim()).filter(Boolean).slice(0, 3),
        insights: parsed.insights.map((item) => String(item).trim()).filter(Boolean).slice(0, 2),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async requireManager(
    companyId: string,
    roles: string[],
    userSub: string | null,
  ) {
    if (!hasAnyRole(roles, ['admin', 'manager'])) {
      throw new ForbiddenException();
    }

    if (!userSub) {
      throw new ForbiddenException();
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        companyId,
        user: { sub: userSub },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException();
    }
  }
}

export function buildBriefingSummary(data: BriefingFacts): BriefingContent {
  const alerts: string[] = [];
  const insights: string[] = [];

  if (data.risks.jobsNeedingConfirmation > 0) {
    alerts.push(`Pending confirmation: ${data.risks.jobsNeedingConfirmation} jobs still need review.`);
  }

  if (data.capacity.overloaded.length > 0) {
    const top = data.capacity.overloaded[0];
    alerts.push(`⚠️ ${top.worker} is overloaded on ${top.day}.`);
  }

  if (data.risks.unpaid > 0) {
    alerts.push(`💰 ${data.risks.unpaid} jobs have been unpaid for more than ${UNPAID_AGE_DAYS} days.`);
  }

  if (data.risks.lateJobs > 0 && alerts.length < 3) {
    alerts.push(`Late jobs: ${data.risks.lateJobs} job${data.risks.lateJobs === 1 ? '' : 's'} need follow-up.`);
  }

  if (data.trends.topService) {
    insights.push(`Most requested service this week: ${data.trends.topService}.`);
  }

  if (data.trends.peakBookingWindow) {
    insights.push(`Peak booking time: ${data.trends.peakBookingWindow}.`);
  }

  if (insights.length < 2 && data.capacity.unassignedJobsCount > 0) {
    insights.push(`${data.capacity.unassignedJobsCount} job${data.capacity.unassignedJobsCount === 1 ? '' : 's'} are still unassigned today.`);
  }

  if (
    data.risks.lateJobs === 0 &&
    data.risks.unpaid === 0 &&
    data.risks.jobsNeedingConfirmation === 0 &&
    data.capacity.unassignedJobsCount === 0
  ) {
    return {
      summary: `Today has ${data.today.total} scheduled jobs. No urgent issues are standing out right now.`,
      alerts: [],
      insights: insights.slice(0, 2),
    };
  }

  return {
    summary: `Today has ${data.today.total} scheduled jobs. ${data.today.pending} still need attention, and the main priorities are listed below.`,
    alerts: alerts.slice(0, 3),
    insights: insights.slice(0, 2),
  };
}
