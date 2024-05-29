import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateETag } from './services/etag.js';
import { searchStocks, getInitialStocks, getNews, getStockNews, getDailyGainers } from './services/stockService.js';
import { checkStock } from './services/checklistCalculator.js';
import HTTP_STATUS from './services/http.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5020;
console.log(PORT)
const corsOptions = {
    allowedHeaders: ['Content-Type', 'If-None-Match'],
    exposedHeaders: ['ETag'],
    origin: '*',
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

app.get('/', (req, res) => {
    res.status(200).send('Welcome to the CANSLIM Calculator API');
});


/**
 * Middleware to log new HTTP requests.
 */
app.use((request, _, next) => {
    const date = new Date();
    const formattedDate = date.toLocaleString('fr-CA', { hour12: false });
    console.log(`New HTTP request: ${request.method} ${request.url} : ${formattedDate}`);
    next();
});

/**
 * Retrieves the initial list of stocks.
 * @memberof module:routes/
 * @name GET /api/stocks
 */  
app.get('/api/stocks/trending', async (req, res) => {
    try {
        const stocks = await getInitialStocks();
        const etag = generateETag(stocks);

        if (req.headers['if-none-match'] === etag) {
            res.status(HTTP_STATUS.NOT_MODIFIED).end();
        } else {
            res.setHeader('ETag', etag);
            res.status(HTTP_STATUS.SUCCESS).json(stocks);
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des stocks:', error);
        res.status(HTTP_STATUS.NOT_FOUND).send();
    }
});

/**
 * Retrieves the initial list of stocks.
 * @memberof module:routes/
 * @name GET /api/stocks
 */  
app.get('/api/stocks/daily-gainers', async (req, res) => {
    try {
        const stocks = await getDailyGainers(10);
        res.status(HTTP_STATUS.SUCCESS).json(stocks);
    } catch (error) {
        console.error('Erreur lors de la récupération des stocks:', error);
        res.status(HTTP_STATUS.NOT_FOUND).send();
    }
});

/**
 * Searches for stocks based on the provided query.
 * @memberof module:routes/search
 * @name GET /api/search
 */
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        const results = await searchStocks(query);
        if (results) {
            res.status(HTTP_STATUS.SUCCESS).json(results)
        } else {
            res.status(HTTP_STATUS.NOT_FOUND).send()
        }
    } catch (error) {
        res.send('Erreur coté serveur')
    }
});

/**
 * Retrieves market news.
 * @memberof module:routes/market-news
 * @name GET /api/market-news
 */
app.post('/api/market-news', async (req, res) => {
    try {
        const tickers = req.body
        const news = await getNews(tickers);
        if (news.length > 0) {
            res.status(HTTP_STATUS.SUCCESS).json(news);
        } else {
            res.status(HTTP_STATUS.NOT_FOUND).send('No news found');
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des actualités:', error);
        res.status(HTTP_STATUS.SERVER_ERROR).send('Internal server error');
    }
});


app.get('/api/check-stock', async (req, res) => {
    try {
        const ticker = req.query.symbol;
        const checklistResults = await checkStock(ticker);
        const stockNews = await getStockNews(ticker)
        res.status(HTTP_STATUS.SUCCESS).json({
            checkList: checklistResults,
            news: stockNews
        });
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'action:', error);
        res.status(HTTP_STATUS.SERVER_ERROR).send('Internal server error');
    }
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}.`);
});
