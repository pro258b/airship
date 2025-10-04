// Financial Strategies Comparison Framework
// Product 1: Lending vs Collateral Borrowing Analysis

class FinancialStrategy {
    constructor(name, description) {
        this.name = name;
        this.description = description;
    }

    calculateReturns(principal, timeMonths) {
        throw new Error("Must implement calculateReturns method");
    }

    getRiskLevel() {
        throw new Error("Must implement getRiskLevel method");
    }
}

class USDTLendingStrategy extends FinancialStrategy {
    constructor() {
        super("USDT Lending", "Lend USDT and earn 8.5% annual interest");
        this.annualRate = 0.085; // 8.5%
        this.riskLevel = "Low";
    }

    calculateReturns(principal, timeMonths) {
        const monthlyRate = this.annualRate / 12;
        const totalReturn = principal * (1 + (monthlyRate * timeMonths));
        const profit = totalReturn - principal;

        return {
            strategy: this.name,
            principal: principal,
            timeMonths: timeMonths,
            finalAmount: totalReturn,
            profit: profit,
            monthlyIncome: profit / timeMonths,
            annualizedReturn: this.annualRate,
            riskLevel: this.riskLevel,
            details: {
                interestEarned: profit,
                monthlyInterest: (principal * monthlyRate),
                effectiveRate: (profit / principal) * (12 / timeMonths)
            }
        };
    }

    getRiskLevel() {
        return this.riskLevel;
    }
}

class BTCCollateralStrategy extends FinancialStrategy {
    constructor() {
        super("BTC Collateral Loan", "Use BTC as collateral to borrow cash at 12.5% annual interest");
        this.borrowRate = 0.125; // 12.5% annual
        this.loanToValue = 0.5; // 50% LTV ratio typical for crypto loans
        this.riskLevel = "High";
    }

    calculateReturns(cashNeeded, timeMonths, btcAppreciationRate = 0.30) {
        // Calculate required BTC collateral (2x cash needed for 50% LTV)
        const btcCollateralValue = cashNeeded / this.loanToValue;

        // Calculate loan interest
        const monthlyBorrowRate = this.borrowRate / 12;
        const totalInterest = cashNeeded * monthlyBorrowRate * timeMonths;
        const monthlyInterest = totalInterest / timeMonths;

        // Calculate BTC appreciation
        const btcAppreciation = btcCollateralValue * btcAppreciationRate;

        // Net result
        const netProfit = btcAppreciation - totalInterest;

        return {
            strategy: this.name,
            cashBorrowed: cashNeeded,
            btcCollateralRequired: btcCollateralValue,
            timeMonths: timeMonths,
            totalInterestPaid: totalInterest,
            monthlyInterest: monthlyInterest,
            btcAppreciationExpected: btcAppreciation,
            netProfit: netProfit,
            annualizedReturn: (netProfit / btcCollateralValue) * (12 / timeMonths),
            riskLevel: this.riskLevel,
            breakEvenBTCGain: (totalInterest / btcCollateralValue),
            details: {
                borrowRate: this.borrowRate,
                loanToValue: this.loanToValue,
                assumedBTCGain: btcAppreciationRate,
                leverageRatio: 1 / this.loanToValue
            }
        };
    }

    getRiskLevel() {
        return this.riskLevel;
    }
}

class StrategyComparator {
    constructor() {
        this.strategies = [];
    }

    addStrategy(strategy) {
        this.strategies.push(strategy);
    }

    // Compare scenario: Want $2000 cash vs lending $2000 USDT
    compareScenarios(amount = 2000, timeMonths = 12, btcGainExpectation = 0.30) {
        const usdtStrategy = new USDTLendingStrategy();
        const btcStrategy = new BTCCollateralStrategy();

        // Scenario 1: Lend $2000 USDT
        const usdtResult = usdtStrategy.calculateReturns(amount, timeMonths);

        // Scenario 2: Buy $4000 BTC, borrow $2000 cash
        const btcResult = btcStrategy.calculateReturns(amount, timeMonths, btcGainExpectation);

        return {
            scenario: {
                targetCash: amount,
                timeframe: `${timeMonths} months`,
                btcExpectedGain: `${(btcGainExpectation * 100).toFixed(1)}%`
            },
            usdtLending: usdtResult,
            btcCollateral: btcResult,
            comparison: {
                usdtNetGain: usdtResult.profit,
                btcNetGain: btcResult.netProfit,
                difference: btcResult.netProfit - usdtResult.profit,
                winner: btcResult.netProfit > usdtResult.profit ? "BTC Collateral" : "USDT Lending",
                btcBreakEvenPoint: btcResult.breakEvenBTCGain,
                riskComparison: `USDT: ${usdtResult.riskLevel} vs BTC: ${btcResult.riskLevel}`
            }
        };
    }

    // Calculate break-even BTC appreciation needed
    calculateBreakEven(cashAmount, timeMonths) {
        const btcStrategy = new BTCCollateralStrategy();
        const usdtStrategy = new USDTLendingStrategy();

        const usdtProfit = usdtStrategy.calculateReturns(cashAmount, timeMonths).profit;
        const btcCollateral = cashAmount / btcStrategy.loanToValue;
        const loanInterest = cashAmount * (btcStrategy.borrowRate / 12) * timeMonths;

        // BTC gain needed to match USDT profit
        const requiredBtcGain = (usdtProfit + loanInterest) / btcCollateral;

        return {
            cashAmount,
            timeMonths,
            usdtProfit,
            loanInterest,
            btcCollateralRequired: btcCollateral,
            breakEvenBTCGain: requiredBtcGain,
            breakEvenBTCGainPercent: (requiredBtcGain * 100).toFixed(2) + "%"
        };
    }
}

// Export for use in HTML
if (typeof window !== 'undefined') {
    window.FinancialStrategies = {
        USDTLendingStrategy,
        BTCCollateralStrategy,
        StrategyComparator
    };
}

// Example usage and testing
if (typeof module !== 'undefined') {
    const comparator = new StrategyComparator();

    // Example comparison: $2000 for 12 months
    console.log("=== Financial Strategy Comparison ===");
    const result = comparator.compareScenarios(2000, 12, 0.30);
    console.log(JSON.stringify(result, null, 2));

    // Break-even analysis
    const breakEven = comparator.calculateBreakEven(2000, 12);
    console.log("\n=== Break-Even Analysis ===");
    console.log(JSON.stringify(breakEven, null, 2));
}