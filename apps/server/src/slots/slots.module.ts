import { Module } from '@nestjs/common';
import { SlotsController, PublicSlotsController } from './slots.controller';
import { SlotsService } from './slots.service';
import { PrismaService } from '@/prisma/prisma.service';

@Module({
    controllers: [SlotsController, PublicSlotsController],
    providers: [SlotsService, PrismaService],
    exports: [SlotsService],
})
export class SlotsModule {}
