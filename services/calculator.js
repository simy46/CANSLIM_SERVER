export function calculateCompositeRating(data) { // OKAY NEEDS TO BE STUDIED //
    const { epsGrowthResult, salesGrowthResult, roeResult, relativeStrengthRatingResult, accumulationDistributionRatingResult } = data;

    if ([epsGrowthResult, salesGrowthResult, roeResult, relativeStrengthRatingResult, accumulationDistributionRatingResult].some(result => result.value === null || result.value === undefined || isNaN(parseFloat(result.value.replace('%', ''))))) {
        return { value: null };
    }

    const normalize = (value, base) => {
        let numericValue = parseFloat(value.replace('%', ''));
        return Math.min(Math.max((numericValue / base) * 100, 0), 100);
    };

    const normalizedEpsGrowth = normalize(epsGrowthResult.value, 25);
    const normalizedSalesGrowth = normalize(salesGrowthResult.value, 25);
    const normalizedROE = normalize(roeResult.value, 17);
    const normalizedRelativeStrengthRating = normalize(relativeStrengthRatingResult.value, 100);
    const normalizedAccumulationDistributionRating = accumulationDistributionRatingResult.value === 'A' ? 100 : accumulationDistributionRatingResult.value === 'B' ? 80 : accumulationDistributionRatingResult.value === 'C' ? 60 : 40;

    const compositeRating = (normalizedEpsGrowth + normalizedSalesGrowth + normalizedROE + normalizedRelativeStrengthRating + normalizedAccumulationDistributionRating) / 5;

    return { value: `${compositeRating.toFixed(2)} %`, bool: compositeRating >= 95 };
}


export function calculateCurrentSharePrice(currentPrice, benchmarkPrice) {
    const value = `$${currentPrice.toFixed(2)}`;
    const bool = currentPrice >= benchmarkPrice;
    return { value: value, bool: bool };
}

export function calculateAverageDailyVolume(averageVolume, benchmarkVolume) {
    const value = `${averageVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} units`;
    const bool = averageVolume >= benchmarkVolume;
    return { value: value, bool: bool  };
}

export function calculateEpsRating(stockData, ratingThresholds) {
    if (!stockData.earnings?.financialsChart?.quarterly || !stockData.defaultKeyStatistics?.sharesOutstanding) {
        return { value: null };
    }

    const quarterlyEarnings = stockData.earnings.financialsChart.quarterly;
    const sharesOutstanding = stockData.defaultKeyStatistics.sharesOutstanding;

    if (quarterlyEarnings.length < 4) { // Not enough data
        return { value: null };
    }

    const quarterlyEps = quarterlyEarnings.map(e => e.earnings / sharesOutstanding);
    const validEps = quarterlyEps.filter(eps => eps !== null && !isNaN(eps) && eps > 0);

    if (validEps.length < 4) {
        return { value: null };
    }

    const growthRates = validEps.slice(1).map((eps, i) => {
        const previousEps = validEps[i];
        return ((eps - previousEps) / previousEps) * 100;
    });

    const averageGrowth = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;

    let rating = ratingThresholds.find(t => averageGrowth >= t.growthRate)?.rating || 50; // Default value if threshold exceeded

    return { value: `${rating.toFixed(2)} %`, bool: rating >= 80 };
}



export function calculateQuarterlyEpsGrowth(stockData) {
    const earningsData = stockData.earnings.financialsChart.quarterly;
    if (earningsData.length >= 4) {
        let growths = [];
        let allAbove25 = true;

        for (let i = 1; i < 4; i++) {
            if (earningsData[i].earnings && earningsData[i - 1].earnings && earningsData[i - 1].earnings !== 0) {
                const currentGrowth = ((earningsData[i].earnings - earningsData[i - 1].earnings) / earningsData[i - 1].earnings) * 100;
                growths.push(currentGrowth);
                if (currentGrowth < 25) {
                    allAbove25 = false;
                }
            } else {
                return { value: null, bool: false };
            }
        }

        return {
            value: `${growths[growths.length - 1].toFixed(2)}%`,
            bool: allAbove25
        };
    }
    return { value: null }; // Not enough data
}






export function calculateThreeQuarterEpsGrowth(stockData) {
    if (!stockData.earnings || !stockData.earnings.financialsChart || !stockData.earnings.financialsChart.quarterly) {
        return { value: null };
    }

    // 3 last quarters
    const quarterlyEarnings = stockData.earnings.financialsChart.quarterly.slice(-3);
    const sharesOutstanding = stockData.defaultKeyStatistics.sharesOutstanding;

    if (quarterlyEarnings.some(e => e.earnings == null) || quarterlyEarnings.length < 3 || !sharesOutstanding) {
        return { value: null }; // Not enough data or invalid data
    }

    const epsValues = quarterlyEarnings.map(e => e.earnings / sharesOutstanding);

    if (epsValues.length < 2) {
        return { value: null }; // Not enough data points to calculate growth
    }

    const growthRates = [];
    for (let i = 1; i < epsValues.length; i++) {
        const previousEps = epsValues[i - 1];
        if (Math.abs(previousEps) < 0.01) {
            if (epsValues[i] === previousEps) {
                growthRates.push(0);
            } else {
                growthRates.push(epsValues[i] > previousEps ? 10000 : -10000);
            }
        } else {
            const growth = ((epsValues[i] - previousEps) / previousEps) * 100;
            growthRates.push(growth);
        }
    }

    const averageGrowth = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    const value = `${averageGrowth.toFixed(2)} %`;

    return { value: value, bool: averageGrowth >= 25 };
}






export function calculateAnnualEpsGrowth(stockData) {
    if (!stockData.earnings || !stockData.earnings.financialsChart || !stockData.earnings.financialsChart.yearly) {
        return { value: null };
    }

    const yearlyEarnings = stockData.earnings.financialsChart.yearly;
    const sharesOutstanding = stockData.defaultKeyStatistics.sharesOutstanding;

    if (yearlyEarnings.length < 4 || !sharesOutstanding) {
        return { value: null }; // Not enough data
    }

    const yearlyEps = yearlyEarnings.map(e => ({
        year: e.date,
        eps: e.earnings / sharesOutstanding
    }));

    const growthRates = [];
    for (let i = 1; i < yearlyEps.length; i++) {
        const growth = ((yearlyEps[i].eps - yearlyEps[i - 1].eps) / yearlyEps[i - 1].eps) * 100;
        growthRates.push(growth);
    }

    const averageGrowth = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    const value = `${averageGrowth.toFixed(2)} %`;

    return { value: value, bool: averageGrowth >= 25 };
}


export function calculateSalesGrowth(earningsData) {
    if (!earningsData || earningsData.length < 2) {
        return { value: null }; // Not enough data
    }

    // Assuming earningsData is sorted from oldest to newest
    const recentSales = earningsData[earningsData.length - 1].revenue;
    const previousSales = earningsData[earningsData.length - 2].revenue;

    if (previousSales === 0) {
        return { value: null };
    }

    const salesGrowth = ((recentSales - previousSales) / previousSales) * 100;
    const formattedSalesGrowth = salesGrowth.toFixed(2);

    return {
        value: `${formattedSalesGrowth}%`,
        bool: salesGrowth >= 20
    };
}


export function calculateRelativeStrengthRating(stockData) {
    if (!stockData.historicalPrices || !stockData.sp500HistoricalPrices) {
        return { value: null };
    }

    const stockPrices = stockData.historicalPrices;
    const sp500Prices = stockData.sp500HistoricalPrices;

    if (stockPrices.length < 2 || sp500Prices.length < 2) {
        return { value: null };
    }

    const startStockPrice = stockPrices[0].close;
    const endStockPrice = stockPrices[stockPrices.length - 1].close;

    const startSp500Price = sp500Prices[0].close;
    const endSp500Price = sp500Prices[sp500Prices.length - 1].close;

    if (startStockPrice == null || endStockPrice == null || startSp500Price == null || endSp500Price == null) {
        return { value: null };
    }

    // Calculate performance of stock and S&P 500
    const stockPerformance = ((endStockPrice - startStockPrice) / startStockPrice) * 100;
    const sp500Performance = ((endSp500Price - startSp500Price) / startSp500Price) * 100;

    // Calculate relative strength
    const relativeStrength = stockPerformance - sp500Performance;

    // Convert relative strength to a rating between 0 and 100
    const relativeStrengthRating = Math.min(Math.max(relativeStrength, 0), 100);

    const value = `${relativeStrength.toFixed(2)} %`;

    return { value: value, bool: relativeStrengthRating >= 80 };
}


export function calculateAcceleratingEarningsGrowthFromEarningsData(earningsData) {
    if (earningsData.length < 2) {
        return { value: null, message: "Not enough data for calculation." };
    }

    let isAccelerating = true;
    let previousGrowth = null;

    for (let i = 1; i < earningsData.length; i++) {
        let currentEarnings = earningsData[i].earnings;
        let previousEarnings = earningsData[i - 1].earnings;

        if (previousEarnings === 0) {
            isAccelerating = false; // To avoid division by zero and infinite growth rate
            break;
        }

        let currentGrowth = ((currentEarnings - previousEarnings) / previousEarnings) * 100;

        if (previousGrowth !== null && currentGrowth <= previousGrowth) {
            isAccelerating = false;
            break;
        }

        previousGrowth = currentGrowth;
    }

    return {
        value: isAccelerating ? "Yes" : "No",
        bool: isAccelerating
    };
}



export function calculateSMRRating(salesGrowth, margin, roe) {
    const salesScore = salesGrowth >= 20 ? 'A' : (salesGrowth >= 15 ? 'B' : 'C');
    const marginScore = margin >= 15 ? 'A' : (margin >= 10 ? 'B' : 'C');
    const roeScore = roe >= 17 ? 'A' : (roe >= 12 ? 'B' : 'C');

    const scores = [salesScore, marginScore, roeScore];
    const aCount = scores.filter(score => score === 'A').length;
    const bCount = scores.filter(score => score === 'B').length;

    if (aCount >= 2) {
        return { value: 'A', bool: true}
    } else if (bCount >= 2 || aCount >= 1) {
        return { value: 'B', bool: true}
    } else {
        return { value: 'C', bool: false}
    }
}


export function calculateIncreaseInFundsOwnership(ownershipList) {
    if (ownershipList.length < 2) {
        return { value: null }; // Not enough data
    }

    // sort by date
    ownershipList.sort((a, b) => new Date(a.reportDate) - new Date(b.reportDate));

    // Get the two most recent records
    const latestOwnership = ownershipList[ownershipList.length - 1];
    const previousOwnership = ownershipList[ownershipList.length - 2];

    // Calculate the increase
    const increase = latestOwnership.position - previousOwnership.position;
    const percentageIncrease = (increase / previousOwnership.position) * 100;

    // Determine if the increase is positive
    const bool = increase > 0;

    return { value: percentageIncrease.toFixed(2) + '%', bool: bool };
}


export function calculateAccumulationDistributionRating(volumeData) {
    if (volumeData.length < 2) {
        return { value: null };
    }

    const recentVolume = volumeData[volumeData.length - 1];
    const averageVolume = volumeData.reduce((sum, volume) => sum + volume, 0) / volumeData.length;

    const rating = recentVolume >= averageVolume * 1.4 ? 'A' :
                   recentVolume >= averageVolume * 1.2 ? 'B' :
                   recentVolume >= averageVolume ? 'C' : 'D';

    return { value: rating, bool: ['A', 'B', 'C'].includes(rating) };
}

export function calculateADRating(historicalPrices) {
    if (historicalPrices.length < 2) {
        return { value: null }; // Not enough data
    }

    // Last 100 jours si disponibles
    const recentPrices = historicalPrices.slice(-100);
    const adlValues = calculateADL(recentPrices);

    const recentADL = adlValues[adlValues.length - 1];
    const previousADL = adlValues[adlValues.length - 2];

    const adlChange = recentADL - previousADL;
    const rating = adlChange > 0 ? (adlChange >= averageADLChange(adlValues) * 1.2 ? 'A' : 'B') : (adlChange <= -averageADLChange(adlValues) * 1.2 ? 'D' : 'C');
    
    return { value: rating, bool: ['A', 'B', 'C'].includes(rating) };
}

function calculateADL(historicalPrices) {
    let adl = 0;
    const adlValues = [];

    for (let i = 0; i < historicalPrices.length; i++) {
        const high = historicalPrices[i].high;
        const low = historicalPrices[i].low;
        const close = historicalPrices[i].close;
        const volume = historicalPrices[i].volume;

        const moneyFlowMultiplier = ((close - low) - (high - close)) / (high - low);
        const moneyFlowVolume = moneyFlowMultiplier * volume;

        adl += moneyFlowVolume;
        adlValues.push(adl);
    }

    return adlValues;
}

function averageADLChange(adlValues) {
    const changes = [];
    for (let i = 1; i < adlValues.length; i++) {
        changes.push(adlValues[i] - adlValues[i - 1]);
    }
    return changes.reduce((sum, change) => sum + change, 0) / changes.length;
}


export function calculateVolumeAboveAverage(currentVolume, averageVolume) {
    if (currentVolume == null || averageVolume == null) {
        return { value: null };
    }

    const percentageAboveAverage = ((currentVolume - averageVolume) / averageVolume) * 100;
    const isAboveThreshold = percentageAboveAverage >= 40 && percentageAboveAverage <= 50;
    const value = `${percentageAboveAverage.toFixed(2)} %`

    return {
        value: value,
        bool: isAboveThreshold
    };
}



export function calculateWithinBuyPoint(currentPrice, idealBuyPoint) {
    if (currentPrice == null || idealBuyPoint == null) {
        return { value: null };
    }

    const tolerance = 0.05; // p-value
    const lowerBound = idealBuyPoint * (1 - tolerance);
    const upperBound = idealBuyPoint * (1 + tolerance);

    const isWithinBuyPoint = currentPrice >= lowerBound && currentPrice <= upperBound;
    const value = `${currentPrice.toFixed(2)} %`

    return {
        value: value,
        bool: isWithinBuyPoint
    };
}


export function calculateMarginFromIncomeStatement(incomeStatementHistory) {
    if (!incomeStatementHistory || incomeStatementHistory.incomeStatementHistory.length < 1) {
        return 0;
    }

    const latestIncomeStatement = incomeStatementHistory.incomeStatementHistory[0];
    const latestRevenue = latestIncomeStatement.totalRevenue;
    const latestEarnings = latestIncomeStatement.netIncome;

    if (!latestRevenue || !latestEarnings) {
        return 0;
    }

    const margin = (latestEarnings / latestRevenue) * 100;
    return margin.toFixed(2);
}

export function extractFundOwnershipData(stockData) {
    const fundOwnershipList = stockData.fundOwnership.ownershipList || [];
    return fundOwnershipList.map(entry => entry.position);
}
