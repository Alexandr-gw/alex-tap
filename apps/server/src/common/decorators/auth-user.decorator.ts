import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const AuthUser = createParamDecorator((_d, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest().user;
});

export const CompanyId = createParamDecorator((_d, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();

    const headerCompanyId =
        (req.headers["x-company-id"] as string | undefined) ??
        (req.headers["companyid"] as string | undefined);

    return (headerCompanyId ?? req.user?.companyId ?? null) as string | null;
});
