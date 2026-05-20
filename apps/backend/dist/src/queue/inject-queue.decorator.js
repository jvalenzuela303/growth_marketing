"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InjectQueue = exports.QUEUE_TOKEN = void 0;
const common_1 = require("@nestjs/common");
const QUEUE_TOKEN = (name) => `BULLMQ_QUEUE_${name.toUpperCase()}`;
exports.QUEUE_TOKEN = QUEUE_TOKEN;
const InjectQueue = (name) => (0, common_1.Inject)((0, exports.QUEUE_TOKEN)(name));
exports.InjectQueue = InjectQueue;
//# sourceMappingURL=inject-queue.decorator.js.map