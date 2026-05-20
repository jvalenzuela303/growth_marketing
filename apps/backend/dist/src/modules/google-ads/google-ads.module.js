"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleAdsModule = void 0;
const common_1 = require("@nestjs/common");
const google_ads_controller_1 = require("./google-ads.controller");
const google_ads_service_1 = require("./google-ads.service");
let GoogleAdsModule = class GoogleAdsModule {
};
exports.GoogleAdsModule = GoogleAdsModule;
exports.GoogleAdsModule = GoogleAdsModule = __decorate([
    (0, common_1.Module)({
        controllers: [google_ads_controller_1.GoogleAdsController],
        providers: [google_ads_service_1.GoogleAdsService],
        exports: [google_ads_service_1.GoogleAdsService],
    })
], GoogleAdsModule);
//# sourceMappingURL=google-ads.module.js.map