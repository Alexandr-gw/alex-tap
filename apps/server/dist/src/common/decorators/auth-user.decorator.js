"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyId = exports.AuthUser = void 0;
const common_1 = require("@nestjs/common");
exports.AuthUser = (0, common_1.createParamDecorator)((_d, ctx) => {
    return ctx.switchToHttp().getRequest().user;
});
exports.CompanyId = (0, common_1.createParamDecorator)((_d, ctx) => {
    return ctx.switchToHttp().getRequest().companyId;
});
//# sourceMappingURL=auth-user.decorator.js.map