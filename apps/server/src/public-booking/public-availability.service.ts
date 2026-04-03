import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { parseISO } from 'date-fns';
import { PrismaService } from '@/prisma/prisma.service';
import { SlotsService } from '@/slots/slots.service';

@Injectable()
export class PublicAvailabilityService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly slots: SlotsService,
    ) {}

    async getPublicSlots(args: { companyId: string; serviceId: string; from: string; to: string }) {
        const fromDate = parseISO(args.from);
        const toDate = parseISO(args.to);
        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()) || toDate <= fromDate) {
            throw new BadRequestException('Invalid from/to');
        }

        const company = await this.prisma.company.findUnique({
            where: { id: args.companyId },
            select: { timezone: true },
        });
        if (!company) throw new NotFoundException('Company not found');

        const timezone = company.timezone ?? 'America/Edmonton';
        const dayKeys: string[] = [];
        let cursor = new Date(fromDate.getTime());
        while (cursor < toDate) {
            const dayKey = new Intl.DateTimeFormat('en-CA', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(cursor);
            if (!dayKeys.includes(dayKey)) dayKeys.push(dayKey);
            cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
        }

        const results = await Promise.all(
            dayKeys.map((day) =>
                this.slots.getCompanySlotsForDay({
                    companyId: args.companyId,
                    serviceId: args.serviceId,
                    day,
                }),
            ),
        );

        return results
            .flatMap((result) => result.slots)
            .filter((slot) => {
                const start = Date.parse(slot.start);
                const end = Date.parse(slot.end);
                return start >= fromDate.getTime() && end <= toDate.getTime();
            })
            .map((slot) => ({ start: slot.start, end: slot.end }));
    }
}
