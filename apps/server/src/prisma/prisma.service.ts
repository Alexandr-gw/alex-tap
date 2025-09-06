import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
        await this.$connect();
        this.registerShutdownHooks();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    private registerShutdownHooks() {
        ['SIGINT', 'SIGTERM', 'SIGUSR2'].forEach((signal) => {
            process.once(signal, async () => {
                await this.$disconnect();
                process.exit(0);
            });
        });
    }
}
