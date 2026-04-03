import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationModule } from '@/notifications/notification.module';
import { ActivityModule } from '@/activity/activity.module';

@Module({
    imports: [PrismaModule, NotificationModule, ActivityModule],
    controllers: [ClientsController],
    providers: [ClientsService],
    exports: [ClientsService],
})
export class ClientsModule {}
