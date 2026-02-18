"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyId = exports.AuthUser = void 0;
const common_1 = require("@nestjs/common");
exports.AuthUser = (0, common_1.createParamDecorator)((_d, ctx) => {
    return ctx.switchToHttp().getRequest().user;
});
exports.CompanyId = (0, common_1.createParamDecorator)((_d, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    const headerCompanyId = req.headers["x-company-id"] ??
        req.headers["companyid"];
    console.log("--- CompanyId decorator ---");
    console.log("req.user:", req.user);
    console.log("x-company-id:", headerCompanyId);
    return (headerCompanyId ?? req.user?.companyId ?? null);
});
//# sourceMappingURL=auth-user.decorator.js.map