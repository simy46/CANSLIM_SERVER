import express from 'express';
import cors from 'cors';
import useragent from 'express-useragent';
import { generateETag } from './services/etag.js';
import * as services from './services/stockService.js';
import { checkStock } from './services/checklistCalculator.js';
import HTTP_STATUS from './services/http.js';
import chalk from 'chalk';


const app = express();
const PORT = process.env.PORT || 5020;
const corsOptions = {
    allowedHeaders: ['Content-Type', 'If-None-Match'],
    exposedHeaders: ['ETag'], 
    origin: '*',
    optionsSuccessStatus: 200
};

app.use(useragent.express());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

// Middleware pour journaliser les nouvelles requêtes HTTP
app.use((request, _, next) => {
    const ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
    const method = request.method;
    const url = request.url;

    // Simplification des informations du user-agent
    const userAgentMap = {
        'Windows': 'Windows',
        'Macintosh': 'Mac',
        'Linux': 'Linux',
        'Safari': 'Safari',
        'Chrome': 'Chrome',
    };

    let userAgent = Object.keys(userAgentMap).find(key => request.headers['user-agent']?.includes(key)) || 'Other';

    // Application des couleurs
    const methodColor = chalk.blue.bold(method);
    const urlColor = chalk.green.bold(url);
    const userAgentColor = chalk.yellow(userAgent);
    const ipColor = chalk.cyan(ip);

    // Construction du message de log
    const logMessage = `${chalk.magenta('-----------------------------------------------------------')}
${methodColor} ${chalk.white('-')} ${urlColor} ${chalk.white('-')} ${userAgentColor} ${chalk.white('[')}${ipColor}${chalk.white('] |')}
${chalk.magenta('-----------------------------------------------------------')}`;

    // Affichage du log
    console.log(logMessage);
    next();
});

app.get('/', (_, res) => {
    res.status(200).send('Welcome to the CANSLIM Calculator API');
});

/**
 * @route POST /upload-image
 * @description Uploads a base64-encoded image to Imgur and returns the URL of the uploaded image.
 * @param {Object} req - Express request object
 * @param {Object} req.body - The request body
 * @param {string} req.body.base64Image - The base64-encoded image string
 * @param {Object} res - Express response object
 * @returns {Object} JSON containing the image URL or an error message
 * @returns {string} res.imageUrl - The URL of the uploaded image on Imgur
 * @returns {string} res.error - The error message if the upload fails
 * @throws {400} If the base64Image is not provided in the request body
 * @throws {500} If the upload to Imgur fails
 * @memberof module:routes/
 */
app.post('/upload-image', async (req, res) => {
    const { base64Image } = req.body;

    if (!base64Image) {
        return res.status(400).json({ error: 'Image is required' });
    }

    const imageUrl = await services.uploadToImgur(base64Image);

    if (imageUrl) {
        return res.json({ imageUrl });
    } else {
        return res.status(500).json({ error: 'Failed to upload image to Imgur' });
    }
});

/**
 * Retrieves the initial list of stocks.
 * @memberof module:routes/
 * @name GET /api/stocks
 */  
app.get('/api/stocks/trending', async (req, res) => {
    try {
        const stocks = await services.getInitialStocks();
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
        const stocks = await services.getDailyGainers(16);
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
        const results = await services.searchStocks(query);
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
        let { tickers } = req.body;
        
        if (!Array.isArray(tickers) || tickers.length === 0) {
            tickers = await services.getTrendingStocks(16);
        }

        const news = await services.getMarketData(tickers);

        if (news.news.length > 0) {
            res.status(200).json(news);
        } else {
            res.status(404).send('No news found');
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des actualités:', error);
        res.status(500).send('Internal server error');
    }
});


app.get('/api/check-stock', async (req, res) => {
    try {
        const ticker = req.query.symbol;
        const checklistResults = await checkStock(ticker);
        res.status(HTTP_STATUS.SUCCESS).json(checklistResults);
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'action:', error);
        res.status(HTTP_STATUS.SERVER_ERROR).send('Internal server error');
    }
});

app.get('/api/stock-details', async (req, res) => {
    try {
        const ticker = req.query.symbol;
        const stockDetails = await services.getStockDetails(ticker);
        res.status(HTTP_STATUS.SUCCESS).json(stockDetails);
    } catch (error) {
        console.error('Erreur lors de la récupération des détails de l\'action:', error);
        res.status(HTTP_STATUS.SERVER_ERROR).send('Internal server error');
    }
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}.`);
});
