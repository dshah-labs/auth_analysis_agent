
import fs from 'fs';
import path from 'path';

const merchants = [
  { id: '8307196', name: 'CVS.COM', rel: 'CVS/CAREMARK' },
  { id: '7800', name: 'CONSUMER', rel: 'CONSUMER' },
  { id: '10785133', name: 'VALVE CORP', rel: 'GLOBAL COL' },
  { id: '8763194', name: 'NETFLIX SERV', rel: 'NETFLIX, INC' },
  { id: '9900112', name: 'TARGET CORP', rel: 'TARGET RETAIL' },
  { id: '4400551', name: 'STARBUCKS', rel: 'COFFEE PARTNERS' },
  { id: '2200883', name: 'APPLE.COM', rel: 'APPLE RETAIL' },
  { id: '6600442', name: 'HOME DEPOT', rel: 'HOME IMPROVEMENT' },
];

const transactionTypes = ['ECOMMERCE'];
const isoReasons = [
  'Declined - Insufficient Funds',
  'Declined - Do Not Honour',
  'Declined - Invalid CVV2',
  'Declined - Suspected Fraud',
  'Declined - Invalid Card Number',
  'Declined - Generic Response Code',
  'Declined - Expired Card'
];

const fundingTypes = ['DEBIT', 'CREDIT', 'PREPAID'];
const cardBrands = ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER'];
const issuers = ['CHASE', 'BOFA', 'WELLS FARGO', 'CITI', 'CAPITAL ONE'];

const dataDir = './data';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const q = (val) => {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// 1. data.csv (Raw Transactions)
function generateDataCsv() {
  let content = 'merchant_id,merchant_name,relationship_name,transaction_date,transaction_type,funding_type,card_brand,issuer_name,avs_response,cvv_response,status,count,is_cross_border,bin_prefix,auth_protocol\n';
  const dates = ['2026-03-01', '2026-03-02', '2026-03-03'];
  const authProtocols = ['3DS', 'NON-3DS'];
  const bins = ['411111', '422222', '533333', '544444', '355555'];

  merchants.forEach(m => {
    dates.forEach(d => {
      fundingTypes.forEach(ft => {
        cardBrands.forEach(cb => {
          issuers.forEach(is => {
            authProtocols.forEach(ap => {
              bins.forEach(bin => {
                const isCB = Math.random() > 0.8 ? 'YES' : 'NO';
                // Successful
                const baseApproved = Math.floor(Math.random() * 50) + 20;
                content += `${m.id},${q(m.name)},${q(m.rel)},${d},ECOMMERCE,${ft},${cb},${is},M,M,APPROVED,${baseApproved},${isCB},${bin},${ap}\n`;
                // Declined
                isoReasons.forEach(reason => {
                  let count = Math.floor(Math.random() * 5);
                  // Inject specific anomalies for certain merchants on March 2nd
                  if (d === '2026-03-02' && m.id === '8307196' && reason.includes('Insufficient Funds')) count += 50;
                  if (d === '2026-03-02' && m.id === '9900112' && cb === 'VISA') count += 40;
                  if (d === '2026-03-02' && m.id === '2200883' && ap === 'NON-3DS') count += 60;
                  
                  if (count > 0) {
                    content += `${m.id},${q(m.name)},${q(m.rel)},${d},ECOMMERCE,${ft},${cb},${is},N,N,${q('DECLINED:' + reason)},${count},${isCB},${bin},${ap}\n`;
                  }
                });
              });
            });
          });
        });
      });
    });
  });
  fs.writeFileSync(path.join(dataDir, 'data.csv'), content);
}

// 2. threshold_data.csv
function generateThresholdCsv() {
  let content = 'RELATIONSHIP_NAME,MERCHANT_ID,MERCHANT_NAME,TRANSACTION_DATE,TRANSACTION_TYPE,TOTAL_TRANSACTIONS,APPROVED_TRANSACTIONS,DECLINED_TRANSACTIONS,ACTUAL_APPROVAL_RATE,APPROVAL_RATE_PCT,DECLINE_RATE_PCT,CRITICAL_THRESHOLD,AVERAGE_TRANSACTIONS,SAMPLE_COUNT,STD_DEVIATION,BREACH_MAGNITUDE,IMPACT_SCORE\n';
  merchants.forEach(m => {
    const total = 121377;
    const approved = 100471;
    const declined = 20906;
    const appRate = 82.78;
    
    // Day 1
    content += `${q(m.rel)},${m.id},${q(m.name)},3/1/26,ECOMMERCE,${total},${approved},${declined},${appRate},${appRate},17.22,92.58,110000,21,500,CRITICAL,${(Math.random() * 100 + 50).toFixed(1)}\n`;
    
    // Day 2 (Analysis Day) - Some high impact for specific merchants
    let impactScore = Math.random() * 200 + 100;
    if (m.id === '8307196') impactScore = 582.4; // Priority 1 for CVS
    if (m.id === '2200883') impactScore = 615.1; // Priority 1 for Apple
    
    content += `${q(m.rel)},${m.id},${q(m.name)},3/2/26,ECOMMERCE,${total + 15000},${approved + 3700},${declined + 11300},76.25,76.25,23.75,92.58,110000,21,500,CRITICAL,${impactScore.toFixed(1)}\n`;
  });
  fs.writeFileSync(path.join(dataDir, 'threshold_data.csv'), content);
}

// 3. decline_analysis_data.csv
function generateDeclineAnalysisCsv() {
  let content = 'MERCHANT_ID,MERCHANT_NAME,RELATIONSHIP_NAME,TRANSACTION_DT,TRANSACTION_TYPE,THRESHOLD_LEVEL,TOTAL_TRANSACTIONS,APPROVAL_COUNT,DECLINE_COUNT,APPROVAL_RATE,MODEL_USED,CRITICAL_THRESHOLD,ISO_RESPONSE_NAME,DECLINE_REASON_COUNT,REASON_PCT_CONTRIBUTION,BENCHMARK_AVG_PCT,BENCHMARK_RANGE,DEVIATION_PCT,DEVIATION_SIGMA,DEVIATION_DIRECTION,SEVERITY,CONTRIBUTION_RANK,DECLINE_IMPACT\n';
  merchants.forEach(m => {
    isoReasons.forEach((reason, i) => {
      const count = 1000 + (i === 0 ? 5000 : Math.random() * 500);
      const pct = (count / 20906 * 100).toFixed(2);
      content += `${m.id},${q(m.name)},${q(m.rel)},3/1/26,ECOMMERCE,CRITICAL,121377,100471,20906,82.78,ROLLING_AVG,92.58,${q(reason)},${count},${pct},4.8,${q('3.6% - 8.2%')},${(parseFloat(pct) - 4.8).toFixed(2)},5.2,UP,HIGH,${i+1},CRITICAL\n`;
    });
  });
  fs.writeFileSync(path.join(dataDir, 'decline_analysis_data.csv'), content);
}

// 4. summary_report.csv
function generateSummaryReport() {
  let content = 'MERCHANT_ID,MERCHANT_NAME,RELATIONSHIP_NAME,MERCHANT_LOCATION,TOTAL_BREACHES,CRITICAL_BREACHES,CRITICAL_PCT,TOP_REASON_1,TOP_REASON_2,REPORT_GENERATED_AT\n';
  merchants.forEach(m => {
    content += `${m.id},${q(m.name)},${q(m.rel)},NORTH AMERICA,5,3,60,${q('Declined - Insufficient Funds')},${q('Declined - Invalid CVV2')},4/16/26 21:32\n`;
  });
  fs.writeFileSync(path.join(dataDir, 'summary_report.csv'), content);
}

generateDataCsv();
generateThresholdCsv();
generateDeclineAnalysisCsv();
generateSummaryReport();
console.log('Synthetic data generated!');
