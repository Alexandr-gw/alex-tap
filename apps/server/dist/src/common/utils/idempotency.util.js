"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashRequestBody = hashRequestBody;
const node_crypto_1 = __importDefault(require("node:crypto"));
function sortKeys(value) {
    if (Array.isArray(value))
        return value.map(sortKeys);
    if (value && typeof value === 'object') {
        return Object.keys(value).sort().reduce((acc, k) => {
            acc[k] = sortKeys(value[k]);
            return acc;
        }, {});
    }
    return value;
}
function hashRequestBody(body) {
    const canonical = JSON.stringify(sortKeys(body));
    return node_crypto_1.default.createHash('sha256').update(canonical).digest('hex');
}
//# sourceMappingURL=idempotency.util.js.map