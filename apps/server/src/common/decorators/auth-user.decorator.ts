import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const AuthUser = createParamDecorator((_d, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest().user;
});

export const CompanyId = createParamDecorator((_d, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest().companyId as string | null;
});
