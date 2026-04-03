import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
    ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksDto } from './dto/list-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

type TasksRequest = Request & {
    user: {
        roles: string[];
        companyId: string | null;
        sub: string | null;
    };
};

@UseGuards(JwtAuthGuard)
@Controller('api/v1/tasks')
export class TasksController {
    constructor(private readonly tasks: TasksService) {}

    @Get()
    async list(
        @Req() req: TasksRequest,
        @Query(new ValidationPipe({ whitelist: true, transform: true })) query: ListTasksDto,
    ) {
        const companyId = req.user.companyId;
        if (!companyId) throw new BadRequestException('companyId is required');

        return this.tasks.list({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            query,
        });
    }

    @Get('customers')
    async listCustomers(@Req() req: TasksRequest) {
        const companyId = req.user.companyId;
        if (!companyId) throw new BadRequestException('companyId is required');

        return this.tasks.listCustomers({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
        });
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Req() req: TasksRequest,
        @Body(new ValidationPipe({ whitelist: true, transform: true })) body: CreateTaskDto,
    ) {
        const companyId = req.user.companyId;
        if (!companyId) throw new BadRequestException('companyId is required');

        return this.tasks.create({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            dto: body,
        });
    }

    @Patch(':id')
    async update(
        @Req() req: TasksRequest,
        @Param('id') id: string,
        @Body(new ValidationPipe({ whitelist: true, transform: true })) body: UpdateTaskDto,
    ) {
        const companyId = req.user.companyId;
        if (!companyId) throw new BadRequestException('companyId is required');

        return this.tasks.update({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            taskId: id,
            dto: body,
        });
    }

    @Delete(':id')
    async remove(@Req() req: TasksRequest, @Param('id') id: string) {
        const companyId = req.user.companyId;
        if (!companyId) throw new BadRequestException('companyId is required');

        await this.tasks.remove({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            taskId: id,
        });

        return { ok: true as const };
    }
}
