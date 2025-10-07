"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasAnyRole = hasAnyRole;
function hasAnyRole(roles, wanted) {
    const set = new Set(roles || []);
    return wanted.some(r => set.has(r));
}
//# sourceMappingURL=roles.util.js.map