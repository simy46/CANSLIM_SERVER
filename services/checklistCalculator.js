import yahooFinance from "yahoo-finance2";
import * as calculations from './calculator.js';

async function getStockData(ticker) {
    if (!ticker) {
        throw new Error('Ticker symbol is undefined');
    }

    const queryOptions = {
        modules: [
            'summaryDetail', 
            'price', 
            'defaultKeyStatistics', 
            'incomeStatementHistory', 
            'earnings', 
            'financialData', 
            'fundOwnership', 
            'institutionOwnership', 
            'majorDirectHolders', 
            'majorHoldersBreakdown', 
            'netSharePurchaseActivity',
            'recommendationTrend'
        ]
    };

    try {
        const stockData = await yahooFinance.quoteSummary(ticker, queryOptions, { validateResult: false });

        const nameAndTicker = await yahooFinance.quote(ticker);
        stockData.nameAndTicker = nameAndTicker;

        // Historical prices and other historical data can remain the same
        const historicalPrices = await yahooFinance.historical(ticker, {
            period1: '2015-01-01', // Can be modified
            period2: new Date().toISOString().split('T')[0],
            interval: '1mo',
        });

        stockData.historicalPrices = historicalPrices;

        const historicalDividends = await yahooFinance.historical(ticker, {
            period1: '2010-01-01', // Can be modified
            period2: new Date().toISOString().split('T')[0],
            interval: '1mo',
            events: 'dividends'
        });

        stockData.historicalDividends = historicalDividends;

        const historicalEarnings = stockData.earnings.financialsChart.yearly.map(entry => ({
            date: entry.date,
            epsActual: entry.earnings
        }));

        stockData.historicalEarnings = historicalEarnings;

        const sp500HistoricalPrices = await yahooFinance.historical('^GSPC', {
            period1: '2010-01-01', // Can be modified
            period2: new Date().toISOString().split('T')[0],
            interval: '1mo'
        });

        stockData.sp500HistoricalPrices = sp500HistoricalPrices;

        return stockData;
    } catch (error) {
        console.error(`Error fetching data for ticker: ${ticker}`, error);
        throw error;
    }
}




function calculateChecklist(stockData) {
    const benchmarks = {
        currentSharePrice: 15,
        averageDailyVolume: 400000,
    };

    // Necessary data
    const summaryDetail = stockData.summaryDetail || {};
    const price = stockData.price || {};
    const returnOnEquity = stockData.financialData.returnOnEquity;
    const quarterlyData = stockData.earnings.financialsChart.quarterly;
    const ownershipList = stockData.fundOwnership.ownershipList;
    console.log(ownershipList)


    const historicalEPS = stockData.historicalEarnings.map(entry => entry.epsActual);
    const currentVolume = summaryDetail.volume;
    const currentPrice = price.regularMarketPrice;
    const averageVolume = summaryDetail.averageVolume;
    const idealBuyPoint = Math.max(...stockData.historicalPrices.slice(-3).map(price => price.high));

    const salesGrowth = calculations.calculateSalesGrowth(quarterlyData);
    const margin = calculations.calculateMarginFromIncomeStatement(stockData.incomeStatementHistory);
    const epsGrowth = calculations.calculateQuarterlyEpsGrowth(stockData);
    const relativeStrengthRating = calculations.calculateRelativeStrengthRating(stockData);
    const acceleratingEarningsGrowth = calculations.calculateAcceleratingEarningsGrowthFromEarningsData(quarterlyData);
    const fundOwnershipData = calculations.extractFundOwnershipData(stockData);
    
    const roe = { // Check //
        value: `${returnOnEquity.toFixed(2)} %`,
        bool: returnOnEquity >= 17
    };
    const currentSharePrice = {    // Check //
        value: `$${currentPrice.toFixed(2)}`,
        bool: currentPrice >= benchmarks.currentSharePrice
    };
    const averageDailyVolume = { // Check //
        value: `${summaryDetail.averageVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} shares`,
        bool: summaryDetail.averageVolume >= benchmarks.averageDailyVolume
    };
    
    const ratingThresholds = [
        { growthRate: 25, rating: 100 },
        { growthRate: 20, rating: 90 },
        { growthRate: 15, rating: 80 },
        { growthRate: 10, rating: 70 },
        { growthRate: 5, rating: 60 }
    ];
    const data = {
        epsGrowthResult: epsGrowth, 
        salesGrowth: salesGrowth, 
        roeResult: roe, 
        relativeStrength: relativeStrengthRating, 
        acceleratingGrowth: acceleratingEarningsGrowth
    }
    
    const results = {
        nameAndTicker: stockData.nameAndTicker,

                // Big Rock 1 // manque 3 attributs //
        //compositeRatingResult: calculations.calculateCompositeRating(data),                               // Composite Rating of 95 or higher
        // epsRatingResult: calculations.calculateEpsRating(stockData, ratingThresholds),
        // epsGrowth: epsGrowth,
        acceleratingEarningsGrowth: acceleratingEarningsGrowth,                                             // Accelerating earnings growth
        // annualEpsGrowth: calculations.calculateAnnualEpsGrowth(stockData),
        salesGrowth: salesGrowth,
        roe: roe,                                                                                           // Return on equity (ROE) of 17% or higher
        // smrRating: calculations.calculateSMRRating(salesGrowth.value, margin, roe.value),


                // Big Rock 2 //
        increaseInFundsOwnership: calculations.calculateIncreaseInFundsOwnership(ownershipList),
        accumulationDistributionRating: calculations.calculateADRating(stockData.historicalPrices),         // Accumulation/Distribution Rating of A, B or C
        relativeStrengthRating: relativeStrengthRating,
        currentSharePrice: currentSharePrice,                                                               // Share price above $15
        averageDailyVolume: averageDailyVolume,                                                             // Average daily volume of 400,000 shares or more               // Big Rock 3 // manque 2 attributs //


                // Big Rock 3 //

        // volumeAboveAverage: calculations.calculateVolumeAboveAverage(currentVolume, averageVolume),

        // withinBuyPoint: calculations.calculateWithinBuyPoint(currentPrice, idealBuyPoint),


        // threeQuarterEpsGrowth: calculations.calculateThreeQuarterEpsGrowth(stockData),

    };

    return results;
}

// CANSLIM //
export async function checkStock(ticker) {
    const stockData = await getStockData(ticker);
    const checklistResults = calculateChecklist(stockData);
    return checklistResults;
}