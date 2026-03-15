/**
 * Cyclone Risk Engine — computes formation risk from live marine inputs
 */
export function computeRisk({ sst, windSpeed, pressure }) {
    const sstContribution = Math.min(Math.max((sst - 26) * 4, 0), 40);
    const windShearScore = Math.min((windSpeed / 20) * 30, 30);
    const pressureAnomaly = Math.min(Math.max((1013 - pressure) * 0.5, 0), 30);
    const totalRisk = Math.round(sstContribution + windShearScore + pressureAnomaly);
    return { totalRisk, sstContribution, windShearScore, pressureAnomaly };
}
