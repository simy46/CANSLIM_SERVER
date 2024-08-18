import yahooFinance from 'yahoo-finance2';
import axios from 'axios';


// TRENDING STOCKS //
export async function getInitialStocks() {
    const stocks = await getTrendingStocks(16);
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
/*
export async function searchStocks(query) {
    console.log(`Recherche de stocks correspondant à : ${query}`);
    const results = await yahooFinance.search(query)
    const filteredResults = results.quotes.filter((quote) => quote.isYahooFinance)
    return filteredResults;
} 
    */
// SEARCH SERVICE //
export async function searchStocks(query) {
    console.log(`Recherche de stocks correspondant à : ${query}`);
    const results = await yahooFinance.search(query);
    return results; // Return the entire search result object
}

// MARKET NEWS //
export async function getMarketData(stocks) {
    const dataPromises = stocks.map(stock =>
        fetchAndProcessNews(stock, 4).then(news => ({
            news: news,
            nav: [],
            lists: [],
            researchReports: []
        }))
    );

    const dataResults = await Promise.all(dataPromises);

    const combinedResults = {
        news: [],
        nav: [],
        lists: [],
        researchReports: []
    };

    const newsUUIDs = new Set();

    dataResults.forEach(result => {
        result.news.forEach(newsItem => {
            if (!newsUUIDs.has(newsItem.uuid)) {
                newsUUIDs.add(newsItem.uuid);
                combinedResults.news.push(newsItem);
            }
        });

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
        data.chart = await fetchChartData(ticker); 
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

async function fetchChartData(ticker) {
    const data = {};
    try {
        const period1 = new Date();
        period1.setFullYear(period1.getFullYear() - 20); // 20 years ago
        const period2 = new Date(); // current date
        const period3 = new Date();
        period3.setDate(period3.getDate() - 59); // 60 days ago
        const period4 = new Date();
        period4.setDate(period4.getDate() - 7); // 7 days ago for 1m interval
        const period5 = new Date();
        period5.setDate(period2.getDate() - 729); // 730 days ago for 1h interval

        const dailyChart = await yahooFinance.chart(ticker, {
            period1: period1.toISOString(),
            period2: period2.toISOString(),
            interval: '1d'
        });
        data.dailyChart = dailyChart;

        const intraday1mChart = await yahooFinance.chart(ticker, {
            period1: period4.toISOString(),
            period2: period2.toISOString(),
            interval: '1m'
        });
        data.intraday1mChart = intraday1mChart;

        const intraday5mChart = await yahooFinance.chart(ticker, {
            period1: period4.toISOString(),
            period2: period2.toISOString(),
            interval: '5m'
        });
        data.intraday5mChart = intraday5mChart;

        const intraday15mChart = await yahooFinance.chart(ticker, {
            period1: period3.toISOString(),
            period2: period2.toISOString(),
            interval: '15m'
        });
        data.intraday15mChart = intraday15mChart;

        const intraday30mChart = await yahooFinance.chart(ticker, {
            period1: period3.toISOString(),
            period2: period2.toISOString(),
            interval: '30m'
        });
        data.intraday30mChart = intraday30mChart;

        const intraday60mChart = await yahooFinance.chart(ticker, {
            period1: period5.toISOString(),
            period2: period2.toISOString(),
            interval: '60m'
        });
        data.intraday60mChart = intraday60mChart;

        const weeklyChart = await yahooFinance.chart(ticker, {
            period1: period1.toISOString(),
            period2: period2.toISOString(),
            interval: '1wk'
        });
        data.weeklyChart = weeklyChart;

        const monthlyChart = await yahooFinance.chart(ticker, {
            period1: period1.toISOString(),
            period2: period2.toISOString(),
            interval: '1mo'
        });
        data.monthlyChart = monthlyChart;

    } catch (error) {
        console.error(`Error fetching chart data for ticker: ${ticker}`, error);
        data.chart = null;
    }

    return data;
}



// Stock news
async function getStockNews(ticker) {
    return await fetchAndProcessNews(ticker, 20);
}

// Imgur 
export async function uploadToImgur(base64Image) {
    const clientId = '445f42d7144f9bf'; // Votre Client ID

    try {
        const response = await axios.post('https://api.imgur.com/3/image', {
            image: base64Image,
            type: 'base64'
        }, {
            headers: {
                Authorization: `Client-ID ${clientId}`
            }
        });

        if (response.data.success) {
            return response.data.data.link; // Retourne le lien public de l'image
        } else {
            console.error('Erreur lors du téléchargement sur Imgur:', response.data);
            return null;
        }
    } catch (error) {
        console.error('Erreur lors de la requête vers Imgur:', error);
        return null;
    }
}