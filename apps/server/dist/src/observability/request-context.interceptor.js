"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestContextInterceptor = void 0;
const common_1 = require("@nestjs/common");
const request_context_service_1 = require("./request-context.service");
let RequestContextInterceptor = class RequestContextInterceptor {
    requestContext;
    constructor(requestContext) {
        this.requestContext = requestContext;
    }
    intercept(context, next) {
        if (context.getType() === 'http') {
            const req = context.switchToHttp().getRequest();
            this.requestContext.set({
                userId: req.user?.userId ?? null,
                userSub: req.user?.sub ?? null,
                companyId: req.user?.companyId ??
                    req.headers?.['x-company-id'] ??
                    req.headers?.['companyid'] ??
                    null,
            });
        }
        return next.handle();
    }
};
exports.RequestContextInterceptor = RequestContextInterceptor;
exports.RequestContextInterceptor = RequestContextInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [request_context_service_1.RequestContextService])
], RequestContextInterceptor);
//# sourceMappingURL=request-context.interceptor.js.map