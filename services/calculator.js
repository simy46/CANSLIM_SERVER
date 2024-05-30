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
    if (!stockData.historicalPrices) {
        return { value: null, bool: false };
    }

    const prices = stockData.historicalPrices.map(price => price.close);

    if (prices.length < 15) {
        return { value: null, bool: false }; // Need at least 15 days of data
    }

    // Calculate daily gains and losses
    const gains = [];
    const losses = [];

    for (let i = 1; i < prices.length; i++) {
        const difference = prices[i] - prices[i - 1];
        if (difference > 0) {
            gains.push(difference);
            losses.push(0);
        } else {
            gains.push(0);
            losses.push(Math.abs(difference));
        }
    }

    // Calculate the average gain and loss
    let averageGain = gains.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
    let averageLoss = losses.slice(0, 14).reduce((a, b) => a + b, 0) / 14;


    let rs = averageGain / averageLoss;
    let rsi = 100 - (100 / (1 + rs));

    for (let i = 14; i < (prices.length - 1); i++) {
        const gain = gains[i];
        const loss = losses[i];

        averageGain = ((averageGain * 13) + gain) / 14;
        averageLoss = ((averageLoss * 13) + loss) / 14;

        rs = averageGain / averageLoss;
        rsi = 100 - (100 / (1 + rs));
    }

    const value = `${rsi.toFixed(2)} %`;

    return { value: value, bool: rsi >= 80 };
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


export function calculateVolumeAboveAverage(summaryDetail) {
    if (!summaryDetail || summaryDetail.regularMarketVolume == null || summaryDetail.averageVolume == null) {
        return { value: null }; // Bad data
    }

    const currentVolume = summaryDetail.regularMarketVolume;
    const averageVolume = summaryDetail.averageVolume;

    const percentageAboveAverage = ((currentVolume - averageVolume) / averageVolume) * 100;

    const value = `${percentageAboveAverage.toFixed(2)} %`;
    const bool = percentageAboveAverage >= 40; // Checking if it is at least 40% above average

    return { value: value, bool: bool };
}

export function calculateWithinBuyPoint(currentPrice, historicalPrices) {
    if (!currentPrice || !historicalPrices || historicalPrices.length < 10) {
        return { value: null, bool: false }; // Bad data or insufficient data
    }

    const idealBuyPoint = calculateIdealBuyPoint(historicalPrices);

    const tolerance = 0.05; // 5% tolerance
    const lowerBound = idealBuyPoint * (1 - tolerance);
    console.log(`LOWER : ${lowerBound}`)
    const upperBound = idealBuyPoint * (1 + tolerance);
    console.log(`UPPER : ${upperBound}`)


    const isWithinBuyPoint = currentPrice >= lowerBound && currentPrice <= upperBound;
    console.log(currentPrice)

    const percentageFromIdeal = ((currentPrice - idealBuyPoint) / idealBuyPoint);
    console.log(percentageFromIdeal)
    const value = isWithinBuyPoint ? `Yes (${percentageFromIdeal.toFixed(2)}%)` : `No (${percentageFromIdeal.toFixed(2)}%)`;

    return {
        value: value,
        bool: isWithinBuyPoint
    };
}

function calculateIdealBuyPoint(historicalPrices) {
    // Filter out unrealistic high prices (outliers)
    const filteredPrices = historicalPrices
        .filter(price => price.high > 0 && price.high < 2 * historicalPrices[0].high);
    
    // Highest intraday in form of "W"
    const highPrices = filteredPrices.map(price => price.high);
    const highestIntraday = Math.max(...highPrices);

    // Margin of 0.10$ to determine the ideal buy point
    const idealBuyPoint = highestIntraday + 0.10;
    console.log(idealBuyPoint)
    return idealBuyPoint;
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

export function calculateBreakout(stockData) { // QUALITATIVE
    if (!stockData.historicalPrices || stockData.historicalPrices.length < 2) {
        return { value: null, bool: false };
    }

    const historicalPrices = stockData.historicalPrices;
    const recentPrice = historicalPrices[historicalPrices.length - 1].close;
    const previousPrice = historicalPrices[historicalPrices.length - 2].close;
    const recentVolume = historicalPrices[historicalPrices.length - 1].volume;
    const averageVolume = stockData.summaryDetail.averageVolume;

    // Simple check for price breakout
    const priceBreakout = recentPrice > previousPrice;

    // Check if volume is significantly higher than average
    const volumeBreakout = recentVolume > averageVolume * 1.4;

    const isBreakout = priceBreakout && volumeBreakout;
    const value = isBreakout ? 'Breakout detected' : 'No breakout';

    return { value: value, bool: isBreakout };
}
