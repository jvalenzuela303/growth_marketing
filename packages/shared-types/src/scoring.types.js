"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEGMENT_THRESHOLDS = void 0;
exports.getSegmentFromScore = getSegmentFromScore;
// Fórmula: B×30 + Q×40 + E×20 + D×10 = 0-100
exports.SEGMENT_THRESHOLDS = {
    fuego: [80, 100],
    caliente: [60, 79],
    tibio: [40, 59],
    frio: [20, 39],
    motor_detenido: [0, 19],
    sin_clasificar: [0, 0],
};
function getSegmentFromScore(score) {
    if (score >= 80)
        return 'fuego';
    if (score >= 60)
        return 'caliente';
    if (score >= 40)
        return 'tibio';
    if (score >= 20)
        return 'frio';
    return 'motor_detenido';
}
//# sourceMappingURL=scoring.types.js.map