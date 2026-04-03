export declare function validateEnv(rawEnv: Record<string, unknown>): Record<string, unknown>;
export declare const configModuleOptions: {
    readonly isGlobal: true;
    readonly envFilePath: string[];
    readonly validate: typeof validateEnv;
};
