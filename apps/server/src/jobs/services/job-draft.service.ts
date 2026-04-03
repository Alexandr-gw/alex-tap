import { BadRequestException, Injectable } from '@nestjs/common';
import { addMinutes, parseISO } from 'date-fns';
import { JobStatus } from '@prisma/client';
import { CreateJobDto } from '../dto/create-job.dto';
import { JobLineItemInput } from '../jobs.types';

@Injectable()
export class JobDraftService {
  getActivityJobLabel(job: {
    title?: string | null;
    lineItems?: Array<{ description?: string | null }>;
  }) {
    return (
      job.title?.trim() ||
      job.lineItems?.find((item) => item.description?.trim())?.description?.trim() ||
      'Job'
    );
  }

  buildJobNumber(jobId: string) {
    return `JOB-${jobId.slice(-6).toUpperCase()}`;
  }

  mapVisitStatus(status: JobStatus) {
    if (status === JobStatus.CANCELED) return 'CANCELED';
    if (status === JobStatus.DONE) return 'COMPLETED';
    return 'SCHEDULED';
  }

  normalizeOptionalText(value: string | null | undefined) {
    const normalized = value?.trim() ?? '';
    return normalized.length ? normalized : null;
  }

  normalizeLineItems(
    items: Array<{ name: string; quantity: number; unitPriceCents: number }>,
  ) {
    return items.map((item) => {
      const name = item.name.trim();
      if (!name.length) {
        throw new BadRequestException('Line item name is required');
      }
      if (item.quantity < 1) {
        throw new BadRequestException('Line item quantity must be at least 1');
      }
      if (item.unitPriceCents < 0) {
        throw new BadRequestException(
          'Line item unit price cannot be negative',
        );
      }

      return {
        name,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
      };
    });
  }

  calculateTotals(
    items: Array<{ quantity: number; unitPriceCents: number }>,
    paidCents: number,
  ) {
    const subtotalCents = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceCents,
      0,
    );
    const taxCents = 0;
    const totalCents = subtotalCents + taxCents;
    const balanceCents = Math.max(totalCents - paidCents, 0);

    return {
      subtotalCents,
      taxCents,
      totalCents,
      balanceCents,
    };
  }

  resolveJobEnd(
    start: Date,
    endValue: string | undefined,
    serviceDurationMins: number | null,
  ) {
    if (endValue) {
      const parsed = parseISO(endValue);
      if (isNaN(parsed.getTime())) throw new BadRequestException('Invalid end');
      if (parsed.getTime() <= start.getTime()) {
        throw new BadRequestException('End time must be after start time');
      }
      return parsed;
    }

    return addMinutes(start, serviceDurationMins ?? 60);
  }

  resolveJobTitle(
    dto: CreateJobDto,
    service: { name: string } | null,
    lineItems: JobLineItemInput[],
  ) {
    return (
      this.normalizeOptionalText(dto.title) ??
      service?.name ??
      lineItems[0]?.name ??
      'Job'
    );
  }

  resolveCreateLineItems(
    dto: CreateJobDto,
    service: { id: string; name: string; basePriceCents: number } | null,
  ): JobLineItemInput[] {
    if (dto.lineItems?.length) {
      return this.normalizeLineItems(dto.lineItems).map((item) => ({
        ...item,
        serviceId: null,
      }));
    }

    if (!service) {
      throw new BadRequestException(
        'Provide a service or at least one line item',
      );
    }

    return [
      {
        name: service.name,
        quantity: 1,
        unitPriceCents: service.basePriceCents,
        serviceId: service.id,
      },
    ];
  }

  resolveClientName(
    name?: string | null,
    firstName?: string | null,
    lastName?: string | null,
  ) {
    const explicit = this.normalizeOptionalText(name);
    if (explicit) return explicit;

    const combined = [
      this.normalizeOptionalText(firstName),
      this.normalizeOptionalText(lastName),
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (!combined.length) {
      throw new BadRequestException('Client name is required');
    }

    return combined;
  }
}
