"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobDraftService = void 0;
const common_1 = require("@nestjs/common");
const date_fns_1 = require("date-fns");
const client_1 = require("@prisma/client");
let JobDraftService = class JobDraftService {
    getActivityJobLabel(job) {
        return (job.title?.trim() ||
            job.lineItems?.find((item) => item.description?.trim())?.description?.trim() ||
            'Job');
    }
    buildJobNumber(jobId) {
        return `JOB-${jobId.slice(-6).toUpperCase()}`;
    }
    mapVisitStatus(status) {
        if (status === client_1.JobStatus.CANCELED)
            return 'CANCELED';
        if (status === client_1.JobStatus.DONE)
            return 'COMPLETED';
        return 'SCHEDULED';
    }
    normalizeOptionalText(value) {
        const normalized = value?.trim() ?? '';
        return normalized.length ? normalized : null;
    }
    normalizeLineItems(items) {
        return items.map((item) => {
            const name = item.name.trim();
            if (!name.length) {
                throw new common_1.BadRequestException('Line item name is required');
            }
            if (item.quantity < 1) {
                throw new common_1.BadRequestException('Line item quantity must be at least 1');
            }
            if (item.unitPriceCents < 0) {
                throw new common_1.BadRequestException('Line item unit price cannot be negative');
            }
            return {
                name,
                quantity: item.quantity,
                unitPriceCents: item.unitPriceCents,
            };
        });
    }
    calculateTotals(items, paidCents) {
        const subtotalCents = items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
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
    resolveJobEnd(start, endValue, serviceDurationMins) {
        if (endValue) {
            const parsed = (0, date_fns_1.parseISO)(endValue);
            if (isNaN(parsed.getTime()))
                throw new common_1.BadRequestException('Invalid end');
            if (parsed.getTime() <= start.getTime()) {
                throw new common_1.BadRequestException('End time must be after start time');
            }
            return parsed;
        }
        return (0, date_fns_1.addMinutes)(start, serviceDurationMins ?? 60);
    }
    resolveJobTitle(dto, service, lineItems) {
        return (this.normalizeOptionalText(dto.title) ??
            service?.name ??
            lineItems[0]?.name ??
            'Job');
    }
    resolveCreateLineItems(dto, service) {
        if (dto.lineItems?.length) {
            return this.normalizeLineItems(dto.lineItems).map((item) => ({
                ...item,
                serviceId: null,
            }));
        }
        if (!service) {
            throw new common_1.BadRequestException('Provide a service or at least one line item');
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
    resolveClientName(name, firstName, lastName) {
        const explicit = this.normalizeOptionalText(name);
        if (explicit)
            return explicit;
        const combined = [
            this.normalizeOptionalText(firstName),
            this.normalizeOptionalText(lastName),
        ]
            .filter(Boolean)
            .join(' ')
            .trim();
        if (!combined.length) {
            throw new common_1.BadRequestException('Client name is required');
        }
        return combined;
    }
};
exports.JobDraftService = JobDraftService;
exports.JobDraftService = JobDraftService = __decorate([
    (0, common_1.Injectable)()
], JobDraftService);
//# sourceMappingURL=job-draft.service.js.map