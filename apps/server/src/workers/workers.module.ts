import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { WorkersController } from './workers.controller';
import { WorkersService } from './workers.service';

@Module({
    controllers: [WorkersController],
    providers: [WorkersService, PrismaService],
    exports: [WorkersService],
})
export class WorkersModule {}
