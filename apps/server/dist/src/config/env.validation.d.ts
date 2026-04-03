export declare function validateEnv(rawEnv: Record<string, unknown>): Record<string, unknown>;
export declare const configModuleOptions: {
    readonly isGlobal: true;
    readonly validate: typeof validateEnv;
};
