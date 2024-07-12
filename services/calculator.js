export function calculateCompositeRating(data) {

    if (!data.epsGrowthResult.value || !data.salesGrowthResult.value || 
        !data.roeResult.value || !data.relativeStrengthRatingResult ||
        !data.percentOffHighResult) {
        return { value:null, weight: 8 }
    }

    // weights
    const weights = {
        epsGrowth: 0.30,
        salesGrowth: 0.10,
        roe: 0.10,
        relativeStrength: 0.30,
        acceleratingGrowth: 0.10,
        percentOffHigh: 0.10
    };

    // Normalize the values to be between 0 and 1
    const normalize = (value) => {
        return parseFloat(value.replace('%', '')) / 100;
    };

    // Extract and normalize the data
    const normalizedData = {
        epsGrowth: normalize(data.epsGrowthResult.value),
        salesGrowth: normalize(data.salesGrowthResult.value),
        roe: normalize(data.roeResult.value),
        relativeStrength: normalize(data.relativeStrengthRatingResult.value),
        acceleratingGrowth: data.acceleratingGrowthResult.bool ? 1 : 0,
        percentOffHigh: data.percentOffHighResult
    };

    // Calculate weighted sum
    const compositeRating = (normalizedData.epsGrowth * weights.epsGrowth) +
                            (normalizedData.salesGrowth * weights.salesGrowth) +
                            (normalizedData.roe * weights.roe) +
                            (normalizedData.relativeStrength * weights.relativeStrength) +
                            (normalizedData.acceleratingGrowth * weights.acceleratingGrowth) +
                            (normalizedData.percentOffHigh * weights.percentOffHigh);

    // Scale to 100 and return as a string with a boolean flag
    const value = `${(compositeRating * 100).toFixed(2)} %`;
    const bool = compositeRating * 100 >= 95;

    return { value: value, bool: bool, weight: 8 };
}

export function calculateEpsRating(stockData) {
    const recentEpsGrowth = calculateRecentEpsGrowth(stockData);
    const annualEpsGrowth = calculateAverageAnnualEpsGrowth(stockData);   

    const epsRatingResult = approximateEpsRating(recentEpsGrowth, annualEpsGrowth);
    return epsRatingResult;
}

function approximateEpsRating(recentGrowth, annualGrowth) {
    if (recentGrowth.value === null || annualGrowth.value === null) {
        return { value: null, weight: 8 }; // bad data
    }

    const recentGrowthValue = parseFloat(recentGrowth.value.replace('%', ''));
    const annualGrowthValue = parseFloat(annualGrowth.value.replace('%', ''));

    // Combine the two growth rates
    const combinedGrowth = (recentGrowthValue + annualGrowthValue) / 2;

    // Assuming a distribution of growth rates, map to a 1-99 scale
    const epsRating = Math.min(Math.max(Math.floor((combinedGrowth / 100) * 99), 1), 99);

    return { value: `${epsRating.toFixed(2)} %`, bool: epsRating >= 80, weight: 8 }; // EPS Rating of 80 or higher
}

export function calculateRecentEpsGrowth(stockData) {
    // Validate the presence of necessary data
    if (!stockData.earnings || !stockData.earnings.earningsChart || !stockData.earnings.earningsChart.quarterly) {
        return { value: null, weight: 9 }; // Bad data
    }

    const quarterlyEarnings = stockData.earnings.earningsChart.quarterly;

    // Ensure there are enough data points (at least 3 quarters)
    if (quarterlyEarnings.length < 4) {
        return { value: null, weight: 9 }; // Not enough data
    }

    // Retrieve EPS for the last three quarters
    const currentEps = quarterlyEarnings[quarterlyEarnings.length - 1].actual;
    const oneQuarterAgoEps = quarterlyEarnings[quarterlyEarnings.length - 2].actual;
    const twoQuartersAgoEps = quarterlyEarnings[quarterlyEarnings.length - 3].actual;
    const threeQuartersAgoEps = quarterlyEarnings[quarterlyEarnings.length - 4].actual;

    // Check if data is valid and ensure no negative values
    if (currentEps == null || oneQuarterAgoEps == null || twoQuartersAgoEps == null || threeQuartersAgoEps == null ||
        currentEps < 0 || oneQuarterAgoEps < 0 || twoQuartersAgoEps < 0 || threeQuartersAgoEps < 0) {
        return { value: null, weight: 9 }; // Invalid data or negative values
    }

    // Calculate EPS growth for the last three quarters
    const growthRates = [
        ((currentEps - oneQuarterAgoEps) / oneQuarterAgoEps) * 100,
        ((oneQuarterAgoEps - twoQuartersAgoEps) / twoQuartersAgoEps) * 100,
        ((twoQuartersAgoEps - threeQuartersAgoEps) / threeQuartersAgoEps) * 100
    ];

    // Calculate the average growth
    const averageGrowth = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;

    const value = `${averageGrowth.toFixed(2)}%`;
    const bool = averageGrowth >= 25;

    return { value: value, bool: bool, weight: 9 };
}

export function calculateAverageAnnualEpsGrowth(stockData) {
    if (!stockData.earnings || !stockData.earnings.financialsChart || !stockData.earnings.financialsChart.yearly) {
        return { value: null, weight:7 }; // Bad data
    }

    const yearlyEarnings = stockData.earnings.financialsChart.yearly;

    // We need at least 4 years of data to calculate growth over the last 3 years
    if (yearlyEarnings.length < 4) {
        return { value: null, weight: 7 }; // Not enough data
    }

    // Extract EPS values for the last 4 years
    const recentEpsValues = yearlyEarnings.slice(-4).map(entry => entry.earnings);

    // Filter out years with negative EPS
    const filteredEpsValues = recentEpsValues.filter(eps => eps > 0);

    // Ensure we still have enough data after filtering
    if (filteredEpsValues.length < 2) {
        return { value: null, weight: 7 }; // Not enough valid data
    }

    // Validate EPS values
    if (filteredEpsValues.some(eps => eps == null || eps === 0)) {
        return { value: null, weight: 7 }; // Invalid data
    }

    // Calculate average annual growth
    const initialEps = filteredEpsValues[0];
    const finalEps = filteredEpsValues[filteredEpsValues.length - 1];
    const years = filteredEpsValues.length - 1;

    const averageAnnualGrowth = ((Math.pow(finalEps / initialEps, 1 / years) - 1) * 100);

    const value = `${averageAnnualGrowth.toFixed(2)}%`;
    const bool = averageAnnualGrowth >= 25;

    return { value: value, bool: bool, weight: 7 };
}

export function calculateSalesGrowth(earningsData) {
    if (!earningsData || earningsData.length < 2) {
        return { value: null, weight:7 }; // Not enough data
    }

    // Assuming earningsData is sorted from oldest to newest
    const recentSales = earningsData[earningsData.length - 1].revenue;
    const previousSales = earningsData[earningsData.length - 2].revenue;

    if (previousSales === 0) {
        return { value: null, weight: 7 };
    }

    const salesGrowth = ((recentSales - previousSales) / previousSales) * 100;
    const formattedSalesGrowth = salesGrowth.toFixed(2);

    return {
        value: `${formattedSalesGrowth}%`,
        bool: salesGrowth >= 20,
        weight: 7
    };
}


export function calculateRelativeStrengthRating(stockData) {
    if (!stockData.historicalPrices) {
        return { value: null, weight: 7 };
    }

    const prices = stockData.historicalPrices.map(price => price.close);

    if (prices.length < 15) {
        return { value: null, weight: 7 }; // Need at least 15 days of data
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

    return { value: value, bool: rsi >= 80, weight: 7 };
}




export function calculateAcceleratingEarningsGrowthFromEarningsData(earningsData) {
    if (earningsData.length < 2) {
        return { value: null, weight: 5 };
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
        bool: isAccelerating,
        weight: 5
    };
}



export function calculateSMRRating(stockData) {
    // Check if necessary data is present
    const financialData = stockData.financialData;
    if (!financialData) {
        return { value: null, weight: 5 }; // Bad data
    }

    // Retrieve necessary data
    const salesGrowth = financialData.revenueGrowth;
    const grossMargin = financialData.grossMargins;
    const roe = financialData.returnOnEquity;

    // Evaluate sales growth (S)
    const salesGrowthRating = salesGrowth > 0.25 ? 'A' :
                              salesGrowth > 0.15 ? 'B' :
                              salesGrowth > 0.05 ? 'C' :
                              salesGrowth > 0 ? 'D' : 'E';

    // Evaluate gross margins (M)
    const marginRating = grossMargin > 0.20 ? 'A' :
                         grossMargin > 0.15 ? 'B' :
                         grossMargin > 0.10 ? 'C' :
                         grossMargin > 0.05 ? 'D' : 'E';

    // Evaluate ROE (R)
    const roeRating = roe > 0.20 ? 'A' :
                      roe > 0.15 ? 'B' :
                      roe > 0.10 ? 'C' :
                      roe > 0.05 ? 'D' : 'E';

    // Calculate the overall SMR Rating (the worst rating among S, M, and R)
    const smrRating = [salesGrowthRating, marginRating, roeRating].sort()[0];

    return { value: smrRating, bool: ['A', 'B'].includes(smrRating), weight: 5 };
}




export function calculateIncreaseInFundsOwnership(ownershipList) {
    if (ownershipList.length < 2) {
        return { value: null, weight: 8 }; // Not enough data
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

    return { value: percentageIncrease.toFixed(2) + '%', bool: bool, weight: 8 };
}

export function calculateADRating(historicalPrices) {
    if (historicalPrices.length < 2) {
        return { value: null, weight: 7 }; // Not enough data
    }

    // Last 100 jours si disponibles
    const recentPrices = historicalPrices.slice(-100);
    const adlValues = calculateADL(recentPrices);

    const recentADL = adlValues[adlValues.length - 1];
    const previousADL = adlValues[adlValues.length - 2];

    const adlChange = recentADL - previousADL;
    const rating = adlChange > 0 ? (adlChange >= averageADLChange(adlValues) * 1.2 ? 'A' : 'B') : (adlChange <= -averageADLChange(adlValues) * 1.2 ? 'D' : 'C');
    
    return { value: rating, bool: ['A', 'B', 'C'].includes(rating), weight: 7 };
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
        return { value: null, weight: 7 }; // Bad data
    }

    const currentVolume = summaryDetail.regularMarketVolume;
    const averageVolume = summaryDetail.averageVolume;

    const percentageAboveAverage = ((currentVolume - averageVolume) / averageVolume) * 100;

    const value = `${percentageAboveAverage.toFixed(2)} %`;
    const bool = percentageAboveAverage >= 40; // Checking if it is at least 40% above average

    return { value: value, bool: bool, weight: 7 };
}

export function calculateWithinBuyPoint(currentPrice, historicalPrices) {
    if (!currentPrice || !historicalPrices || historicalPrices.length < 10) {
        return { value: null, weight: 5 }; // Bad data or insufficient data
    }

    const idealBuyPoint = calculateIdealBuyPoint(historicalPrices);

    const tolerance = 0.05; // 5% tolerance
    const lowerBound = idealBuyPoint * (1 - tolerance);
    const upperBound = idealBuyPoint * (1 + tolerance);


    const isWithinBuyPoint = currentPrice >= lowerBound && currentPrice <= upperBound;

    // const percentageFromIdeal = ((currentPrice - idealBuyPoint) / idealBuyPoint);
    const value = isWithinBuyPoint ? 'Yes' : 'No';
    return {
        value: value,
        bool: isWithinBuyPoint,
        weight: 5
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
    return idealBuyPoint;
}

export function calculateBreakout(stockData) { // QUALITATIVE
    if (!stockData.historicalPrices || stockData.historicalPrices.length < 2) {
        return { value: null, weight: 8 };
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

    return { value: value, bool: isBreakout, weight: 8 };
}

export function calculateRelativeStrengthLineInNewHigh(stockData) {
    if (!stockData.historicalPrices || !stockData.sp500HistoricalPrices) {
        return { value: null, weight: 6 };
    }

    const stockPrices = stockData.historicalPrices;
    const sp500Prices = stockData.sp500HistoricalPrices;

    if (stockPrices.length < 2 || sp500Prices.length < 2) {
        return { value: null, weight: 6 };
    }

    // Create a mapping of dates for the reference index prices
    const sp500PricesMap = new Map();
    sp500Prices.forEach(price => {
        sp500PricesMap.set(new Date(price.date).toISOString().split('T')[0], price.close);
    });

    // Filter stock prices to only use dates common with the reference index
    const commonPrices = stockPrices.filter(price => sp500PricesMap.has(new Date(price.date).toISOString().split('T')[0]));

    // If not enough common data, return null
    if (commonPrices.length < 2) {
        return { value: null, weight: 6 };
    }

    // Calculate relative strength for each common day
    const relativeStrength = commonPrices.map(price => {
        const date = new Date(price.date).toISOString().split('T')[0];
        const stockClose = price.close;
        const sp500Close = sp500PricesMap.get(date);
        if (sp500Close == 0) return null;
        return (stockClose / sp500Close) * 100;
    }).filter(rs => rs !== null);

    if (relativeStrength.length < 2) {
        return { value: nullcalculateRel, weight: 6 };
    }

    // Check if current relative strength is the highest
    const currentRelativeStrength = relativeStrength[relativeStrength.length - 1];
    const isNewHigh = currentRelativeStrength >= Math.max(...relativeStrength);

    // const value = `${currentRelativeStrength.toFixed(2)}`;

    return {
        value: isNewHigh ? "Yes" : "No",
        bool: isNewHigh,
        weight: 6
    };
}
