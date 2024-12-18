import yahooFinance from "yahoo-finance2";
import * as calculations from './calculator.js';

async function getStockData(ticker) {
    if (!ticker) {
        throw new Error('Ticker symbol is undefined');
    }

    const validation = {
        validateResult: false
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

    const queryQuote = { 
        fields: [
            "regularMarketPrice", 
            "shortName", 
            "longName", 
            "fiftyTwoWeekHigh", 
            "trailingAnnualDividendYield", 
            "fiftyTwoWeekLow", 
            "epsTrailingTwelveMonths", 
            "epsCurrentYear", 
            "sharesOutstanding"
        ] 
    }

    const stockData = {};

    try {
        stockData.quoteSummary = await yahooFinance.quoteSummary(ticker, queryOptions, validation);
    } catch (error) {
        console.error(`Error fetching quote summary for ticker: ${ticker}`, error);
        stockData.quoteSummary = {};
    }

    try {
        
        stockData.stockInfo = await yahooFinance.quote(ticker, queryQuote, validation);
        const { regularMarketPrice, fiftyTwoWeekHigh } = stockData.stockInfo;
        stockData.percentOffHigh = ((1 - (regularMarketPrice / fiftyTwoWeekHigh)) * 100).toFixed(2);
    } catch (error) {
        console.error(`Error fetching stock info for ticker: ${ticker}`, error);
        stockData.stockInfoError = error.message;
    }

    try {
        stockData.historicalPrices = await yahooFinance.historical(ticker, {
            period1: '2010-01-01', // Can be modified
            period2: new Date().toISOString().split('T')[0],
            interval: '1mo',
        });
    } catch (error) {
        console.error(`Error fetching historical prices for ticker: ${ticker}`, error);
        stockData.historicalPricesError = error.message;
    }

    try {
        stockData.historicalDividends = await yahooFinance.historical(ticker, {
            period1: '2010-01-01', // Can be modified
            period2: new Date().toISOString().split('T')[0],
            interval: '1mo',
            events: 'dividends'
        });
    } catch (error) {
        console.error(`Error fetching historical dividends for ticker: ${ticker}`, error);
        stockData.historicalDividendsError = error.message;
    }

    if (stockData.quoteSummary && stockData.quoteSummary.earnings && stockData.quoteSummary.earnings.financialsChart) {
        stockData.historicalEarnings = stockData.quoteSummary.earnings.financialsChart.yearly.map(entry => ({
            date: entry.date,
            epsActual: entry.earnings
        }));
    }

    try {
        stockData.sp500HistoricalPrices = await yahooFinance.historical('^GSPC', {
            period1: '2010-01-01', // Can be modified
            period2: new Date().toISOString().split('T')[0],
            interval: '1mo'
        });
    } catch (error) {
        console.error('Error fetching historical prices for S&P 500:', error);
        stockData.sp500HistoricalPricesError = error.message;
    }

    try {
        stockData.nasdaqHistoricalPrices = await yahooFinance.historical('^IXIC', {
            period1: '2010-01-01', // Can be modified
            period2: new Date().toISOString().split('T')[0],
            interval: '1mo'
        });
    } catch (error) {
        console.error('Error fetching historical prices for NASDAQ:', error);
        stockData.nasdaqHistoricalPricesError = error.message;
    }

    try {
        const period1 = '2023-01-01';
        const period2 = new Date().toISOString().split('T')[0];
        const chartDataSP500 = await yahooFinance.chart('^GSPC', { period1, period2, interval: '1d' });
        const chartDataNASDAQ = await yahooFinance.chart('^IXIC', { period1, period2, interval: '1d' });
        stockData.chartDataSP500 = chartDataSP500;
        stockData.chartDataNASDAQ = chartDataNASDAQ;
        stockData.chartDataSP500 = chartDataSP500;
        stockData.chartDataNASDAQ = chartDataNASDAQ;
    } catch (error) {
        console.error('Error fetching chart data:', error);
        stockData.chartDataError = error.message;
    }

    // Assurez-vous que financialData est inclus dans stockData
    stockData.financialData = stockData.quoteSummary.financialData || {};

    return stockData;
}

function calculateChecklist(stockData) {
    const benchmarks = {
        currentSharePrice: 15,
        averageDailyVolume: 400000,
    };

    // Vérifications des données
    const summaryDetail = stockData.quoteSummary?.summaryDetail || {};
    const price = stockData.quoteSummary?.price || {};
    const financialData = stockData.quoteSummary?.financialData || {};
    const earnings = stockData.quoteSummary?.earnings || {};
    const fundOwnership = stockData.quoteSummary?.fundOwnership || {};

    // Vérification de returnOnEquity
    const returnOnEquity = financialData.returnOnEquity !== undefined 
        ? `${(financialData.returnOnEquity * 100).toFixed(2)} %` 
        : null;
    const returnOnEquityBool = financialData.returnOnEquity !== undefined 
        ? financialData.returnOnEquity * 100 >= 17 
        : false;
    
    // Vérification de quarterlyData
    const quarterlyData = earnings.financialsChart 
        ? earnings.financialsChart.quarterly 
        : [];
    
    // Vérification de ownershipList
    const ownershipList = fundOwnership.ownershipList || [];
    
    // Vérification de currentPrice
    const currentPrice = price.regularMarketPrice || 0;

    const salesGrowth = calculations.calculateSalesGrowth(quarterlyData);
    const epsGrowth = calculations.calculateRecentEpsGrowth(earnings);
    const relativeStrengthRating = calculations.calculateRelativeStrengthRating(stockData);
    const acceleratingEarningsGrowth = calculations.calculateAcceleratingEarningsGrowthFromEarningsData(quarterlyData);
    
    const roe = {
        value: returnOnEquity,
        bool: returnOnEquityBool,
        weight: 6
    };
    const currentSharePrice = {
        value: `$${currentPrice.toFixed(2)}`,
        bool: currentPrice >= benchmarks.currentSharePrice, 
        weight: 5
    };
    const averageDailyVolume = {
        value: summaryDetail.averageVolume !== undefined 
            ? `${summaryDetail.averageVolume.toLocaleString(undefined)} shares` 
            : 'N/A',
        bool: summaryDetail.averageVolume !== undefined 
            ? summaryDetail.averageVolume >= benchmarks.averageDailyVolume 
            : false,
        weight: 5
    };

    const data = {
        epsGrowthResult: epsGrowth, 
        salesGrowthResult: salesGrowth, 
        roeResult: roe, 
        relativeStrengthRatingResult: relativeStrengthRating, 
        acceleratingGrowthResult: acceleratingEarningsGrowth,
        percentOffHighResult: stockData.percentOffHigh ? (stockData.percentOffHigh / 100) : null
    };
    
    const results = {
        stockInfo: stockData.stockInfo,

        // Big Rock 1
        marketTrend: calculations.determineMarketTrend(stockData.sp500HistoricalPrices, stockData.nasdaqHistoricalPrices),

        // Big Rock 2
        compositeRatingResult: calculations.calculateCompositeRating(data),
        epsRatingResult: calculations.calculateEpsRating(earnings),
        epsGrowth: epsGrowth,
        acceleratingEarningsGrowth: acceleratingEarningsGrowth,
        annualEpsGrowth: calculations.calculateAverageAnnualEpsGrowth(earnings),
        salesGrowth: salesGrowth,
        roe: roe,
        smrRating: calculations.calculateSMRRating(stockData),

        // Big Rock 3
        increaseInFundsOwnership: calculations.calculateIncreaseInFundsOwnership(ownershipList),
        accumulationDistributionRating: calculations.calculateADRating(stockData.historicalPrices),
        relativeStrengthRating: relativeStrengthRating,
        currentSharePrice: currentSharePrice,
        averageDailyVolume: averageDailyVolume,

        // Big Rock 4
        breakingOutOfSoundBase: calculations.calculateBreakout(stockData),
        volumeAboveAverage: calculations.calculateVolumeAboveAverage(summaryDetail),
        rsLine: calculations.calculateRelativeStrengthLineInNewHigh(stockData),
        withinBuyPoint: calculations.calculateWithinBuyPoint(currentPrice, stockData.historicalPrices),
    };

    const overall = calculations.calculateOverallCANSLIM(results);

    results.overall = overall

    return results;
}

// CANSLIM //
export async function checkStock(ticker) {
    const stockData = await getStockData(ticker);
    const checklistResults = calculateChecklist(stockData);
    return checklistResults;
}