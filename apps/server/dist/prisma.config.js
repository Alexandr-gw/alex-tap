"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const config_1 = require("prisma/config");
require("dotenv/config");
exports.default = (0, config_1.defineConfig)({
    schema: node_path_1.default.join('prisma', 'schema.prisma'),
    migrations: {
        path: node_path_1.default.join('prisma', 'migrations'),
        seed: 'tsx prisma/seed.ts',
    },
});
//# sourceMappingURL=prisma.config.js.map