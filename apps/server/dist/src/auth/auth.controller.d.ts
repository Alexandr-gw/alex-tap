import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AppLogger } from '@/observability/app-logger.service';
export declare class AuthController {
    private readonly AuthService;
    private cfg;
    private readonly logger;
    constructor(AuthService: AuthService, cfg: ConfigService, logger: AppLogger);
    private getCookieOptions;
    private normalizeReturnTo;
    private buildAppRedirect;
    private getAuthorizationEndpoint;
    private beginLogin;
    login(req: any, res: any): any;
    loginUrl(req: any, res: any): any;
    callback(req: any, res: any): Promise<any>;
    refresh(req: any, res: any): Promise<any>;
    logout(req: any, res: any): Promise<any>;
}
