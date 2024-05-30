import yahooFinance from 'yahoo-finance2';

// TRENDING STOCKS //
async function getInitialStocks() {
    const stocks = await getTrendingStocks(10);
    const fields = {
        fields: [
            "displayName", "longName", "symbol", "regularMarketPrice", "currency",
            "regularMarketChange", "regularMarketChangePercent", "regularMarketVolume",
            "regularMarketOpen", "regularMarketDayHigh", "regularMarketDayLow"
        ]
    };
    const validation = { validateResult: false }
    const results = await yahooFinance.quote(stocks, fields, validation);
    
    return results;
}

async function getTrendingStocks(count) {
    const options = {
        count: count,
        lang: "en-US"
    }
    const stocks = await yahooFinance.trendingSymbols('US', options);
    const results = stocks.quotes.map(s => s.symbol);
    return results;
}

async function getDailyGainers(count) {
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
async function searchStocks(query) {
    console.log(`Recherche de stocks correspondant à : ${query}`);
    const results = await yahooFinance.search(query)
    const filteredResults = results.quotes.filter((quote) => quote.isYahooFinance)
    return filteredResults;
}

// MARKET NEWS //
async function getNews(stocks) {
    const queryOptions = {
        newsCount: 2,
        quotesCount: 0,
        region: "US",
        lang: "en-US"
    };

    const newsPromises = stocks.map(stock => 
        yahooFinance.search(stock, queryOptions)
            .then(result => result.news || [])
    );

    const newsResults = await Promise.all(newsPromises);

    return newsResults.flat();
}

async function getStockNews(ticker) {
    const queryOptions = {
        newsCount: 5,
        quotesCount: 0,
        region: "US",
        lang: "en-US"
    };
    const stock = await yahooFinance.search(ticker, queryOptions)
    const news = stock.news
    return news
}

export { searchStocks, getInitialStocks, getNews, getStockNews, getDailyGainers, getTrendingStocks };
