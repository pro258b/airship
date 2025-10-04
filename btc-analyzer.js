// BTC Historical Analysis and Projection Module
// Simulates historical BTC performance for strategy projections

class BTCHistoricalAnalyzer {
    constructor() {
        // Simulated historical BTC data based on real patterns (2019-2024)
        this.historicalYearlyReturns = [
            { year: 2019, return: 0.87 },   // 87% gain
            { year: 2020, return: 3.00 },   // 300% gain (COVID bull run)
            { year: 2021, return: 0.60 },   // 60% gain (peak year)
            { year: 2022, return: -0.64 },  // -64% loss (bear market)
            { year: 2023, return: 1.56 },   // 156% gain (recovery)
            { year: 2024, return: 0.45 }    // 45% gain (current estimate)
        ];

        this.monthlyVolatility = 0.20; // 20% monthly standard deviation
    }

    // Calculate statistical projections based on historical data
    getProjectionRanges(timeMonths = 12) {
        const yearlyData = this.historicalYearlyReturns.map(d => d.return);

        // Calculate statistics
        const avgReturn = this.average(yearlyData);
        const stdDev = this.standardDeviation(yearlyData);
        const medianReturn = this.median(yearlyData);

        // Annualize to requested timeframe
        const timeMultiplier = timeMonths / 12;

        // Conservative projections (10th-90th percentile)
        const conservativeMin = (medianReturn - stdDev) * timeMultiplier;
        const conservativeMax = (medianReturn + stdDev) * timeMultiplier;

        // Realistic projections (25th-75th percentile)
        const realisticMin = (avgReturn - (stdDev * 0.5)) * timeMultiplier;
        const realisticMax = (avgReturn + (stdDev * 0.5)) * timeMultiplier;

        // Extreme projections (based on historical min/max)
        const extremeMin = Math.min(...yearlyData) * timeMultiplier;
        const extremeMax = Math.max(...yearlyData) * timeMultiplier;

        return {
            timeframe: `${timeMonths} months`,
            historical: {
                avgAnnualReturn: avgReturn,
                medianAnnualReturn: medianReturn,
                standardDeviation: stdDev,
                worstYear: Math.min(...yearlyData),
                bestYear: Math.max(...yearlyData),
                dataPoints: this.historicalYearlyReturns
            },
            projections: {
                conservative: {
                    min: Math.max(conservativeMin, -0.80), // Cap at -80% max loss
                    max: conservativeMax,
                    description: "Conservative estimate (10th-90th percentile)"
                },
                realistic: {
                    min: Math.max(realisticMin, -0.70), // Cap at -70% max loss
                    max: realisticMax,
                    description: "Realistic estimate (25th-75th percentile)"
                },
                extreme: {
                    min: Math.max(extremeMin, -0.80), // Historical worst case
                    max: extremeMax, // Historical best case
                    description: "Extreme range (historical min/max)"
                }
            }
        };
    }

    // Get scenario-based projections
    getScenarioProjections(timeMonths = 12) {
        const projections = this.getProjectionRanges(timeMonths);

        return {
            bearMarket: {
                min: projections.projections.conservative.min,
                max: -0.10, // -10% to worst case
                probability: 0.20,
                description: "Bear market scenario"
            },
            sidewaysMarket: {
                min: -0.20,
                max: 0.30,
                probability: 0.40,
                description: "Sideways/consolidation market"
            },
            bullMarket: {
                min: 0.30,
                max: projections.projections.extreme.max,
                probability: 0.40,
                description: "Bull market scenario"
            }
        };
    }

    // Utility functions
    average(arr) {
        return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    }

    median(arr) {
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
    }

    standardDeviation(arr) {
        const avg = this.average(arr);
        const squaredDiffs = arr.map(val => Math.pow(val - avg, 2));
        const avgSquaredDiff = this.average(squaredDiffs);
        return Math.sqrt(avgSquaredDiff);
    }

    // Format ranges for display
    formatRange(min, max, asPercentage = true) {
        if (asPercentage) {
            const minPercent = (min * 100).toFixed(0);
            const maxPercent = (max * 100).toFixed(0);
            return `${minPercent}% to ${maxPercent}%`;
        }
        return `${min.toFixed(2)} to ${max.toFixed(2)}`;
    }

    // Get recommended ranges for user input
    getRecommendedInputRanges(timeMonths = 12) {
        const scenarios = this.getScenarioProjections(timeMonths);

        return {
            conservative: {
                min: scenarios.bearMarket.min,
                max: scenarios.sidewaysMarket.max,
                default: scenarios.sidewaysMarket
            },
            moderate: {
                min: scenarios.sidewaysMarket.min,
                max: scenarios.bullMarket.min + 0.20,
                default: scenarios.bullMarket
            },
            aggressive: {
                min: scenarios.bullMarket.min,
                max: scenarios.bullMarket.max,
                default: scenarios.bullMarket
            }
        };
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.BTCAnalyzer = BTCHistoricalAnalyzer;
}

if (typeof module !== 'undefined') {
    module.exports = BTCHistoricalAnalyzer;
}