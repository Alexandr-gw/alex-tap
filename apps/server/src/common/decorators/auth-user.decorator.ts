import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const AuthUser = createParamDecorator((_d, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest().user;
});

export const CompanyId = createParamDecorator((_d, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();

    const headerCompanyId =
        (req.headers["x-company-id"] as string | undefined) ??
        (req.headers["companyid"] as string | undefined);

    console.log("--- CompanyId decorator ---");
    console.log("req.user:", req.user);
    console.log("x-company-id:", headerCompanyId);

    return (headerCompanyId ?? req.user?.companyId ?? null) as string | null;
});
