"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudienceExportsModule = void 0;
const common_1 = require("@nestjs/common");
const audience_exports_controller_1 = require("./audience-exports.controller");
const audience_exports_service_1 = require("./audience-exports.service");
let AudienceExportsModule = class AudienceExportsModule {
};
exports.AudienceExportsModule = AudienceExportsModule;
exports.AudienceExportsModule = AudienceExportsModule = __decorate([
    (0, common_1.Module)({
        controllers: [audience_exports_controller_1.AudienceExportsController],
        providers: [audience_exports_service_1.AudienceExportsService],
        exports: [audience_exports_service_1.AudienceExportsService],
    })
], AudienceExportsModule);
//# sourceMappingURL=audience-exports.module.js.map