import yahooFinance from 'yahoo-finance2';

// TRENDING STOCKS //
export async function getInitialStocks() {
    const stocks = await getTrendingStocks(10);
    const fields = {
        fields: [
            "displayName", "longName", "symbol", "regularMarketPrice", "currency",
            "regularMarketChange", "regularMarketChangePercent", "regularMarketVolume",
            "regularMarketOpen", "regularMarketDayHigh", "regularMarketDayLow",
            "marketCap", "exchange", "region", "language", "quoteSourceName",
            "beta", "market", "regularMarketTime", "fiftyTwoWeekRange", "dividendDate",
            "trailingAnnualDividendYield", "regularMarketChange"
        ]
    };
    const validation = { validateResult: false }
    const results = await yahooFinance.quote(stocks, fields, validation);
    
    return results;
}


export async function getTrendingStocks(count) {
    const options = {
        count: count,
        lang: "en-US"
    }
    const stocks = await yahooFinance.trendingSymbols('US', options);
    const results = stocks.quotes.map(s => s.symbol);
    return results;
}

export async function getDailyGainers(count) {
    const validation = { validateResult: false }
    const queryOptions = { 
        count: count, 
        region: 'US', 
        lang: 'en-US' 
    };

    const dailyGainers = await yahooFinance.dailyGainers(queryOptions, validation);
    const results = dailyGainers.quotes.sort((a,b) => b.regularMarketChange - a.regularMarketChange);
    return results;

}

// SEARCH SERVICE //
export async function searchStocks(query) {
    console.log(`Recherche de stocks correspondant à : ${query}`);
    const results = await yahooFinance.search(query)
    const filteredResults = results.quotes.filter((quote) => quote.isYahooFinance)
    return filteredResults;
}

// MARKET NEWS //
export async function getMarketData(stocks) {
    const dataPromises = stocks.map(stock =>
        fetchAndProcessNews(stock, 2).then(news => ({
            news: news,
            nav: [],
            lists: [],
            researchReports: []
        }))
    );

    const dataResults = await Promise.all(dataPromises);

    // Combine all results into a single object with each category
    const combinedResults = {
        news: [],
        nav: [],
        lists: [],
        researchReports: []
    };

    // Use a Set to track unique news UUIDs
    const newsUUIDs = new Set();

    dataResults.forEach(result => {
        result.news.forEach(newsItem => {
            if (!newsUUIDs.has(newsItem.uuid)) {
                newsUUIDs.add(newsItem.uuid);
                combinedResults.news.push(newsItem);
            }
        });

        // Since nav, lists, and researchReports are empty in this example,
        // if you have actual data for these categories, you can process them similarly.
        combinedResults.nav.push(...result.nav);
        combinedResults.lists.push(...result.lists);
        combinedResults.researchReports.push(...result.researchReports);
    });

    return combinedResults;
}


async function fetchAndProcessNews(ticker, newsCount) {
    const queryOptions = {
        newsCount: newsCount,
        quotesCount: 0,
        region: "US",
        lang: "en-US"
    };
    
    const stock = await yahooFinance.search(ticker, queryOptions);
    const news = stock.news || [];

    // Utiliser un Set pour éliminer les doublons basés sur l'UUID
    const uniqueNews = [];
    const newsUUIDs = new Set();

    news.forEach(newsItem => {
        if (!newsUUIDs.has(newsItem.uuid)) {
            newsUUIDs.add(newsItem.uuid);
            uniqueNews.push(newsItem);
        }
    });

    return uniqueNews;
}


export async function getStockDetails(ticker) {
    const data = {};

    // Quote Summary & Profile
    try {
        const module = {
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
                'recommendationTrend',
                'assetProfile',
                'summaryProfile',
                'fundProfile'
            ]
        };
        const stockInfo = await yahooFinance.quoteSummary(ticker, module);
        data.quoteSummary = stockInfo;
    } catch (error) {
        console.error(`Error fetching quote summary data for ticker: ${ticker}`, error);
        data.quoteSummary = null;
    }

    // Options
    try {
        const options = await yahooFinance.options(ticker);
        data.options = options;
    } catch (error) {
        console.error(`Error fetching options data for ticker: ${ticker}`, error);
        data.options = null;
    }

    // Recommendations Symbols
    try {
        const recommendations = await yahooFinance.recommendationsBySymbol(ticker);
        data.recommendations = recommendations;
    } catch (error) {
        console.error(`Error fetching recommendations for ticker: ${ticker}`, error);
        data.recommendations = null;
    }

    // News
    try {
        const news = await getStockNews(ticker);
        data.news = news;
    } catch (error) {
        console.error(`Error fetching news for ticker: ${ticker}`, error);
        data.news = null;
    }

    // Chart
    try {
        const period1 = new Date();
        period1.setFullYear(period1.getFullYear() - 10); // 10 years ago
        const period2 = new Date(); // current date

        const chart = await yahooFinance.chart(ticker, { period1: period1.toISOString(), period2: period2.toISOString(), interval: '1d' });
        data.chart = chart;
    } catch (error) {
        console.error(`Error fetching chart data for ticker: ${ticker}`, error);
        data.chart = null;
    }

    // Insights
    try {
        const insights = await yahooFinance.insights(ticker);
        data.insights = insights;
    } catch (error) {
        console.error(`Error fetching insights for ticker: ${ticker}`, error);
        data.insights = null;
    }

    return data;
}


// Stock news
async function getStockNews(ticker) {
    return await fetchAndProcessNews(ticker, 20);
}