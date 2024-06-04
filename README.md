
# CANSLIM_SERVER

### © @simy46, 2024

## Project Description
**CANSLIM_SERVER** is the backend server for the CANSLIM Calculator application, designed to implement the investment principles from *"How to Make Money in Stocks Getting Started: A Guide to Putting CAN SLIM Concepts into Action"* by Matthew Galgani. The server handles requests from the front-end, fetches data from external APIs, processes it, and sends back the necessary information to evaluate the investment potential of stocks based on the CAN SLIM criteria.

### Project Links
- **Website**: [CANSLIM Calculator](https://canslimcalculator-simy46s-projects.vercel.app/)
- **Frontend Repository**: [CANSLIM Frontend](https://github.com/simy46/CANSLIM)
- **Server Repository**: [CANSLIM Server](https://github.com/simy46/CANSLIM_SERVER)

### Project Structure
This server is developed using Express.js on Node.js and handles the backend operations of the CANSLIM Calculator.


### Criteria Calculated
The CANSLIM Calculator evaluates stocks based on the following criteria, each derived from the CAN SLIM methodology:

- **Composite Rating**: An overall rating combining several fundamental and technical factors, targeting a score of 95 or higher.
- **EPS Rating**: Earnings Per Share rating of 80 or higher.
- **EPS Growth**: Growth in EPS of 25% or higher in recent quarters.
- **Accelerating Earnings Growth**: Evidence of accelerating earnings growth.
- **Average Annual EPS Growth**: An average annual EPS growth of 25% or more over the last 3 years.
- **Sales Growth**: Sales growth of 20%-25% or higher in the most recent quarter.
- **Return on Equity (ROE)**: ROE of 17% or higher.
- **SMR Rating**: Sales + Margins + Return on Equity rating of A or B.
- **Increase in Funds Ownership**: Increase in the number of institutional funds owning the stock.
- **Accumulation/Distribution Rating**: Rating of A, B, or C, indicating the buying and selling activity of institutional investors.
- **Relative Strength Rating**: Measures a stock's price performance relative to all other stocks, targeting a high rating.
- **Current Share Price**: Share price above $15.
- **Average Daily Volume**: Average daily trading volume of 400,000 shares or more.
- **Breaking Out of Sound Base**: Stock breaking out of a sound base or an alternative buy point.
- **Volume Above Average on Breakout**: Volume at least 40% to 50% above average on breakout.
- **Relative Strength Line in New High Ground**: Indicates if the relative strength line is in new high ground.
- **Within Buy Point**: Stock price within 5% of the ideal buy point.

### Usage Guidelines
This server is intended for personal and educational use only. Commercial use of this code is not permitted. While I welcome comments and suggestions for improvement, I ask that you do not copy or redistribute the code or the core ideas without my consent.

### Installation
To install and run the server locally, follow these steps:

1. Clone the repository:
   \`\`\`sh
   git clone https://github.com/simy46/CANSLIM_SERVER.git
   cd CANSLIM_SERVER
   \`\`\`

2. Install the dependencies:
```bash
    npm install
```

3. Start the server:

```bash
   npm start
```

For development purposes, you can use the following command to start the server with nodemon:
```bash
   npm run dev
```   

### API Endpoints
The server provides several endpoints to interact with the front-end application. These include fetching stock data, processing CANSLIM criteria, and more. Detailed documentation of the endpoints will be provided in future updates.

### Contributions
Feedback and suggestions are highly encouraged! However, any significant changes or uses of the project's code require my approval. Please feel free to open issues or pull requests on the project's GitHub repository.

### Disclaimer
This project is a personal academic exercise and is not affiliated with any company or professional entity, including Yahoo Finance or Matthew Galgani. The results provided by the algorithm should be viewed as educational insights rather than professional investment advice. Always perform your own due diligence before making any investment decisions.
