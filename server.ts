import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { parse } from "csv-parse/sync";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Utility to read CSV with error handling
  const readCsv = (filename: string) => {
    try {
      const filePath = path.join(process.cwd(), 'data', filename);
      if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        return [];
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      return parse(content, { columns: true, skip_empty_lines: true, trim: true });
    } catch (error) {
      console.error(`Error parsing CSV ${filename}:`, error);
      throw error;
    }
  };

  // API Tools with explicit error catching
  app.get("/api/merchants", (req, res) => {
    try {
      const data = readCsv('threshold_data.csv');
      const uniqueMerchants = Array.from(new Set(data.map((m: any) => JSON.stringify({ id: m.MERCHANT_ID, name: m.MERCHANT_NAME }))))
        .map((s: string) => JSON.parse(s));
      res.json(uniqueMerchants);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch merchants', details: String(err) });
    }
  });

  app.get("/api/tools/thresholds", (req, res) => {
    try {
      const { merchantId } = req.query;
      let data = readCsv('threshold_data.csv');
      if (merchantId) {
        data = data.filter((row: any) => row.MERCHANT_ID === merchantId);
      }
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Failed to read threshold data', details: String(err) });
    }
  });

  app.get("/api/tools/decline-analysis", (req, res) => {
    try {
      const { merchantId } = req.query;
      let data = readCsv('decline_analysis_data.csv');
      if (merchantId) {
        data = data.filter((row: any) => row.MERCHANT_ID === merchantId);
      }
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Failed to read decline analysis', details: String(err) });
    }
  });

  app.get("/api/tools/summary", (req, res) => {
    try {
      const { merchantId } = req.query;
      let data = readCsv('summary_report.csv');
      if (merchantId) {
        data = data.filter((row: any) => row.MERCHANT_ID === merchantId);
      }
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Failed to read summary report', details: String(err) });
    }
  });

  app.post("/api/tools/drilldown/funding", (req, res) => {
    try {
      const { merchantId } = req.body;
      const data = readCsv('data.csv');
      const merchantData = data.filter((row: any) => row.merchant_id === merchantId);
      
      const fundingStats: any = {};
      merchantData.forEach((row: any) => {
         const ft = row.funding_type;
         const isDeclined = row.status.startsWith('DECLINED');
         const count = parseInt(row.count) || 0;
         if (!fundingStats[ft]) fundingStats[ft] = { approved: 0, declined: 0 };
         if (isDeclined) fundingStats[ft].declined += count;
         else fundingStats[ft].approved += count;
      });
      res.json(fundingStats);
    } catch (err) {
      res.status(500).json({ error: 'Funding drilldown failed', details: String(err) });
    }
  });

  app.post("/api/tools/drilldown/card-brand", (req, res) => {
    try {
      const { merchantId } = req.body;
      const data = readCsv('data.csv');
      const merchantData = data.filter((row: any) => row.merchant_id === merchantId);
      
      const brandStats: any = {};
      merchantData.forEach((row: any) => {
         const brand = row.card_brand;
         const isDeclined = row.status.startsWith('DECLINED');
         const count = parseInt(row.count) || 0;
         if (!brandStats[brand]) brandStats[brand] = { approved: 0, declined: 0 };
         if (isDeclined) brandStats[brand].declined += count;
         else brandStats[brand].approved += count;
      });
      res.json(brandStats);
    } catch (err) {
      res.status(500).json({ error: 'Card brand drilldown failed', details: String(err) });
    }
  });

  app.post("/api/tools/drilldown/issuer", (req, res) => {
    try {
      const { merchantId } = req.body;
      const data = readCsv('data.csv');
      const merchantData = data.filter((row: any) => row.merchant_id === merchantId);
      
      const issuerStats: any = {};
      merchantData.forEach((row: any) => {
         const issuer = row.issuer_name;
         const isDeclined = row.status.startsWith('DECLINED');
         const count = parseInt(row.count) || 0;
         if (!issuerStats[issuer]) issuerStats[issuer] = { approved: 0, declined: 0 };
         if (isDeclined) issuerStats[issuer].declined += count;
         else issuerStats[issuer].approved += count;
      });
      res.json(issuerStats);
    } catch (err) {
      res.status(500).json({ error: 'Issuer drilldown failed', details: String(err) });
    }
  });

  app.post("/api/tools/drilldown/signals", (req, res) => {
    try {
      const { merchantId } = req.body;
      const data = readCsv('data.csv');
      const merchantData = data.filter((row: any) => row.merchant_id === merchantId);
      
      const signalStats: any = {
        avs: { match: 0, mismatch: 0 },
        cvv: { match: 0, mismatch: 0 }
      };
      merchantData.forEach((row: any) => {
         const count = parseInt(row.count) || 0;
         if (row.avs_response === 'M') signalStats.avs.match += count;
         else signalStats.avs.mismatch += count;
         
         if (row.cvv_response === 'M') signalStats.cvv.match += count;
         else signalStats.cvv.mismatch += count;
      });
      res.json(signalStats);
    } catch (err) {
      res.status(500).json({ error: 'Signal drilldown failed', details: String(err) });
    }
  });

  app.post("/api/tools/drilldown/cross-border", (req, res) => {
    try {
      const { merchantId } = req.body;
      const data = readCsv('data.csv');
      const merchantData = data.filter((row: any) => row.merchant_id === merchantId);
      
      const stats: any = {};
      merchantData.forEach((row: any) => {
         const key = row.is_cross_border;
         const isDeclined = row.status.startsWith('DECLINED');
         const count = parseInt(row.count) || 0;
         if (!stats[key]) stats[key] = { approved: 0, declined: 0 };
         if (isDeclined) stats[key].declined += count;
         else stats[key].approved += count;
      });
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: 'Cross-border drilldown failed', details: String(err) });
    }
  });

  app.post("/api/tools/drilldown/bin", (req, res) => {
    try {
      const { merchantId } = req.body;
      const data = readCsv('data.csv');
      const merchantData = data.filter((row: any) => row.merchant_id === merchantId);
      
      const stats: any = {};
      merchantData.forEach((row: any) => {
         const key = row.bin_prefix;
         const isDeclined = row.status.startsWith('DECLINED');
         const count = parseInt(row.count) || 0;
         if (!stats[key]) stats[key] = { approved: 0, declined: 0 };
         if (isDeclined) stats[key].declined += count;
         else stats[key].approved += count;
      });
      // Return top 5 failing BINs
      const sorted = Object.entries(stats)
        .sort((a: any, b: any) => b[1].declined - a[1].declined)
        .slice(0, 5);
      res.json(Object.fromEntries(sorted));
    } catch (err) {
      res.status(500).json({ error: 'BIN drilldown failed', details: String(err) });
    }
  });

  app.post("/api/tools/drilldown/auth-protocol", (req, res) => {
    try {
      const { merchantId } = req.body;
      const data = readCsv('data.csv');
      const merchantData = data.filter((row: any) => row.merchant_id === merchantId);
      
      const stats: any = {};
      merchantData.forEach((row: any) => {
         const key = row.auth_protocol;
         const isDeclined = row.status.startsWith('DECLINED');
         const count = parseInt(row.count) || 0;
         if (!stats[key]) stats[key] = { approved: 0, declined: 0 };
         if (isDeclined) stats[key].declined += count;
         else stats[key].approved += count;
      });
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: 'Auth protocol drilldown failed', details: String(err) });
    }
  });

  app.post("/api/tools/impact", (req, res) => {
    try {
      const { merchantId } = req.body;
      const data = readCsv('threshold_data.csv');
      const merchantRow = data.find((row: any) => row.MERCHANT_ID === merchantId);
      res.json(merchantRow || { error: 'Not found' });
    } catch (err) {
      res.status(500).json({ error: 'Impact analysis failed', details: String(err) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
