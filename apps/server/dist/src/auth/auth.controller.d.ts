import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly AuthService;
    private cfg;
    constructor(AuthService: AuthService, cfg: ConfigService);
    private getCookieOptions;
    private normalizeReturnTo;
    private buildAppRedirect;
    private beginLogin;
    login(req: any, res: any): any;
    loginUrl(req: any, res: any): any;
    callback(req: any, res: any): Promise<any>;
    refresh(req: any, res: any): Promise<any>;
    logout(req: any, res: any): Promise<any>;
}
