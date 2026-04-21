# Auth Anomaly Orchestrator

This is a full-stack AI-powered diagnostic tool for merchant transaction authorization anomalies.

## Local Setup

Follow these steps to run the application on your local machine:

### 1. Prerequisites
- Node.js (v18 or higher)
- A Google Gemini API Key (available at [aistudio.google.com](https://aistudio.google.com))

### 2. Installation

```bash
# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory and add your API key:

```env
GEMINI_API_KEY=your_api_key_here
```

### 4. Data Generation
Before running the app, generate the synthetic CSV datasets:

```bash
npm run generate-data
# OR
npx tsx generate_data.js
```

### 5. Start the Application

```bash
# Starts both Express server and Vite frontend
npm run dev
```

The application will be available at `http://localhost:3000`.

## Architecture

- **Frontend**: React + Vite + Tailwind CSS + Framer Motion.
- **Backend**: Node.js + Express (serving diagnostic tools and raw CSV data analysis).
- **Agent Framework**: 
  - *Current*: Native Google GenAI SDK with custom orchestration loop.
  - *Optional Migration*: LangChain integration (see `src/App.tsx` for migration progress).

## Diagnostic Tools

The orchestrator uses several specialized tools to drill down into anomalies:
- `getThresholdBreaches`: Checks daily approval rate deviations.
- `drilldownFundingType`: Analyzes Impact of Debit vs. Credit.
- `drilldownCardBrand`: Isolates specific Brand issues (Visa/Mastercard).
- `drilldownBIN`: Identifies failing card series.
- `drilldownAuthProtocol`: Compares 3DS vs. Non-3DS health.
- `drilldownCrossBorder`: Checks international performance.
