import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { PrismaService } from '@/prisma/prisma.service';
import { SlotsService } from '@/slots/slots.service';
import {NotificationModule} from "@/notifications/notification.module";

@Module({
    imports: [NotificationModule],
    controllers: [JobsController],
    providers: [JobsService, PrismaService, SlotsService],
    exports: [JobsService],
})
export class JobsModule {}
