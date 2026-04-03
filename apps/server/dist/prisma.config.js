"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = require("prisma/config");
const nodeEnv = process.env.NODE_ENV?.trim() || undefined;
const envFiles = [
    node_path_1.default.resolve('.env'),
    ...(nodeEnv ? [node_path_1.default.resolve(`.env.${nodeEnv}`)] : []),
    ...(nodeEnv !== 'test' ? [node_path_1.default.resolve('.env.local')] : []),
    ...(nodeEnv ? [node_path_1.default.resolve(`.env.${nodeEnv}.local`)] : []),
];
for (const envFile of [...new Set(envFiles)]) {
    if (node_fs_1.default.existsSync(envFile)) {
        dotenv_1.default.config({ path: envFile, override: false });
    }
}
exports.default = (0, config_1.defineConfig)({
    schema: node_path_1.default.join('prisma', 'schema.prisma'),
    migrations: {
        path: node_path_1.default.join('prisma', 'migrations'),
        seed: 'tsx prisma/seed.ts',
    },
});
//# sourceMappingURL=prisma.config.js.map