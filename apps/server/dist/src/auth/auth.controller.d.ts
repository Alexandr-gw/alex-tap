import { AuthService } from './auth.service';
import { ConfigService } from "@nestjs/config";
export declare class AuthController {
    private readonly AuthService;
    private cfg;
    constructor(AuthService: AuthService, cfg: ConfigService);
    login(req: any, res: any): any;
    callback(req: any, res: any): Promise<any>;
    refresh(req: any, res: any): Promise<any>;
    logout(req: any, res: any): Promise<any>;
}
