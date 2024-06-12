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

        const stockInfo = await yahooFinance.quote(ticker, { fields: [ "symbol", "displayName" ] });

        stockData.stockInfo = stockInfo;

        // Historical prices and other historical data can remain the same
        const historicalPrices = await yahooFinance.historical(ticker, {
            period1: '2010-01-01', // Can be modified
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
    const returnOnEquity = stockData.financialData.returnOnEquity ? `${(stockData.financialData.returnOnEquity * 100).toFixed(2)} %` : null;
    const returnOnEquityBool = stockData.financialData.returnOnEquity ? stockData.financialData.returnOnEquity * 100 >= 17 : '';
    const quarterlyData = stockData.earnings.financialsChart.quarterly;
    const ownershipList = stockData.fundOwnership.ownershipList;
    const currentPrice = price.regularMarketPrice;

    const salesGrowth = calculations.calculateSalesGrowth(quarterlyData);
    const epsGrowth = calculations.calculateRecentEpsGrowth(stockData);
    const relativeStrengthRating = calculations.calculateRelativeStrengthRating(stockData);
    const acceleratingEarningsGrowth = calculations.calculateAcceleratingEarningsGrowthFromEarningsData(quarterlyData);
    
    const roe = { // Check //
        value: returnOnEquity,
        bool: returnOnEquityBool
    };
    const currentSharePrice = {    // Check //
        value: `$${currentPrice.toFixed(2)}`,
        bool: currentPrice >= benchmarks.currentSharePrice
    };
    const averageDailyVolume = { // Check //
        value: `${summaryDetail.averageVolume.toLocaleString(undefined)} shares`,
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
        stockInfo: stockData.stockInfo,

                // Big Rock 1 // manque 3 attributs //

        //compositeRatingResult: calculations.calculateCompositeRating(data),                           // Composite Rating of 95 or higher
        // epsRatingResult: calculations.calculateEpsRating(stockData, ratingThresholds),               // EPS Rating of 80 or higher
        epsGrowth: epsGrowth,                                                                           // EPS growth 25% or higher in recent quarters
        acceleratingEarningsGrowth: acceleratingEarningsGrowth,                                         // Accelerating earnings growth
        annualEpsGrowth: calculations.calculateAverageAnnualEpsGrowth(stockData),                       // Average Annual EPS growth 25% or more over last 3 years
        salesGrowth: salesGrowth,                                                                       // Sales growth 20%-25% or higher in most recent quarter
        roe: roe,                                                                                       // Return on equity (ROE) of 17% or higher
        smrRating: calculations.calculateSMRRating(stockData),                                          // SMR Rating (Sales + Margins + Return on Equity) of A or B

        // 3 more //


                // Big Rock 2 //

        increaseInFundsOwnership: calculations.calculateIncreaseInFundsOwnership(ownershipList),
        accumulationDistributionRating: calculations.calculateADRating(stockData.historicalPrices),     // Accumulation/Distribution Rating of A, B or C
        relativeStrengthRating: relativeStrengthRating,                                                 // Relative Strength Rating of 80 or higher
        currentSharePrice: currentSharePrice,                                                           // Share price above $15
        averageDailyVolume: averageDailyVolume,                                                         // Average daily volume of 400,000 shares or more 


                // Big Rock 3 //

        breakingOutOfSoundBase: calculations.calculateBreakout(stockData),                              // Breaking out of sound base or alternative buy point
        volumeAboveAverage: calculations.calculateVolumeAboveAverage(summaryDetail),                    // Volume at least 40% to 50% above average on breakout
        rsLine: calculations.calculateRelativeStrengthLineInNewHigh(stockData),                         // Relative strength line in new high ground
        withinBuyPoint: calculations.calculateWithinBuyPoint(currentPrice, stockData.historicalPrices), // Within 5% of ideal buy point

    };

    return results;
}

// CANSLIM //
export async function checkStock(ticker) {
    const stockData = await getStockData(ticker);
    const checklistResults = calculateChecklist(stockData);
    return checklistResults;
}