"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const tslib_1 = require("tslib");
const sqlite3_1 = tslib_1.__importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const node_path_1 = tslib_1.__importDefault(require("node:path"));
exports.db = null;
(() => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    if (exports.db == null) {
        exports.db = yield (0, sqlite_1.open)({ filename: node_path_1.default.join(__dirname, "..", "data", "bot.db"), driver: sqlite3_1.default.Database });
    }
}))();
//# sourceMappingURL=database.js.map