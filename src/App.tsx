import { useState, useEffect, useCallback } from 'react';
import { Type, FunctionDeclaration } from "@google/genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage, ToolMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import { 
  Activity, 
  AlertTriangle, 
  TrendingDown, 
  Search, 
  Bot, 
  BarChart3, 
  ShieldAlert, 
  CreditCard, 
  Building2, 
  Zap, 
  PieChart,
  ArrowRight,
  Info,
  CheckCircle2,
  FileText,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

// --- Types ---
interface AnalysisStep {
  thought: string;
  toolCall?: string;
  result?: any;
}

// --- Tool Declarations for Gemini ---
const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "getThresholdBreaches",
    description: "Fetch all threshold breach data for merchants, identifying active anomalies.",
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: "getDeclineAnalysis",
    description: "Get detailed decline reason analysis including benchmarks and deviations.",
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: "getSummaryReport",
    description: "Fetch a high-level summary report for all merchants and their breach history.",
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: "drilldownFundingType",
    description: "Concentration analysis by funding type (Debit, Credit, Prepaid) for a specific merchant.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        merchantId: { type: Type.STRING, description: "The ID of the merchant to analyze." }
      },
      required: ["merchantId"]
    }
  },
  {
    name: "drilldownCardBrand",
    description: "Analyze which card brands (Visa, Mastercard, Amex, etc.) are driving declines.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        merchantId: { type: Type.STRING, description: "The ID of the merchant to analyze." }
      },
      required: ["merchantId"]
    }
  },
  {
    name: "drilldownIssuer",
    description: "Analyze if specific issuers/banks are contributing to the spike.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        merchantId: { type: Type.STRING, description: "The ID of the merchant to analyze." }
      },
      required: ["merchantId"]
    }
  },
  {
    name: "drilldownSignals",
    description: "Analyze AVS/CVV signals for data quality or fraud patterns.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        merchantId: { type: Type.STRING, description: "The ID of the merchant to analyze." }
      },
      required: ["merchantId"]
    }
  },
  {
    name: "getVolumeImpact",
    description: "Analyze the total volume impact and severity for a merchant.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        merchantId: { type: Type.STRING, description: "The ID of the merchant to analyze." }
      },
      required: ["merchantId"]
    }
  },
  {
    name: "drilldownCrossBorder",
    description: "Compare domestic vs. international (cross-border) decline rates.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        merchantId: { type: Type.STRING, description: "The ID of the merchant to analyze." }
      },
      required: ["merchantId"]
    }
  },
  {
    name: "drilldownBIN",
    description: "Analyze the top 5 Bank Identification Number (BIN) prefixes contributing to declines.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        merchantId: { type: Type.STRING, description: "The ID of the merchant to analyze." }
      },
      required: ["merchantId"]
    }
  },
  {
    name: "drilldownAuthProtocol",
    description: "Analyze the impact of 3DS vs. Non-3DS authentication on decline rates.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        merchantId: { type: Type.STRING, description: "The ID of the merchant to analyze." }
      },
      required: ["merchantId"]
    }
  }
];

export default function App() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [steps, setSteps] = useState<AnalysisStep[]>([]);
  const [finalReport, setFinalReport] = useState<string | null>(null);
  const [merchants, setMerchants] = useState<{id: string, name: string}[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState('8307196');
  const [merchantMetrics, setMerchantMetrics] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/merchants')
      .then(res => res.json())
      .then(data => {
        setMerchants(data);
        if (data.length > 0 && !data.find((m: any) => m.id === selectedMerchant)) {
          setSelectedMerchant(data[0].id);
        }
      })
      .catch(err => console.error('Failed to load merchants', err));
  }, []);

  useEffect(() => {
    if (selectedMerchant) {
      fetch(`/api/tools/thresholds?merchantId=${selectedMerchant}`)
        .then(res => res.json())
        .then(data => {
          // Get the latest day (March 2nd)
          const latest = data.find((d: any) => d.TRANSACTION_DATE === '3/2/26');
          setMerchantMetrics(latest);
        })
        .catch(err => console.error('Failed to load merchant metrics', err));
    }
  }, [selectedMerchant]);

  const activeMerchantName = merchants.find(m => m.id === selectedMerchant)?.name || 'Loading...';
  const impactScore = parseFloat(merchantMetrics?.IMPACT_SCORE || '0');
  const isP1 = impactScore > 500;

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const executeTool = async (name: string, args: any) => {
    addLog(`Calling tool: ${name} with ${JSON.stringify(args)}`);
    let endpoint = '';
    let options: any = { method: 'GET' };
    const queryParams = new URLSearchParams({ merchantId: selectedMerchant }).toString();

    switch (name) {
      case 'getThresholdBreaches': endpoint = `/api/tools/thresholds?${queryParams}`; break;
      case 'getDeclineAnalysis': endpoint = `/api/tools/decline-analysis?${queryParams}`; break;
      case 'getSummaryReport': endpoint = `/api/tools/summary?${queryParams}`; break;
      case 'drilldownFundingType': 
        endpoint = '/api/tools/drilldown/funding'; 
        options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) };
        break;
      case 'drilldownCardBrand':
        endpoint = '/api/tools/drilldown/card-brand';
        options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) };
        break;
      case 'drilldownIssuer':
        endpoint = '/api/tools/drilldown/issuer';
        options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) };
        break;
      case 'drilldownSignals':
        endpoint = '/api/tools/drilldown/signals';
        options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) };
        break;
      case 'getVolumeImpact':
        endpoint = '/api/tools/impact';
        options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) };
        break;
      case 'drilldownCrossBorder':
        endpoint = '/api/tools/drilldown/cross-border';
        options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) };
        break;
      case 'drilldownBIN':
        endpoint = '/api/tools/drilldown/bin';
        options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) };
        break;
      case 'drilldownAuthProtocol':
        endpoint = '/api/tools/drilldown/auth-protocol';
        options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) };
        break;
    }

    try {
      const res = await fetch(endpoint, options);
      return await res.json();
    } catch (err) {
      console.error(err);
      return { error: 'Failed to fetch tool output' };
    }
  };

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    setSteps([]);
    setFinalReport(null);
    setLogs([]);
    addLog("Initializing LangChain Coordinator Agent...");

    try {
      const model = new ChatGoogleGenerativeAI({
        model: "gemini-3-flash-preview",
        apiKey: process.env.GEMINI_API_KEY,
        maxOutputTokens: 3000,
      });

      const systemPrompt = `You are an Authorization Anomaly Coordinator Agent. 
            Objective: Analyze the anomaly for merchant ID ${selectedMerchant} (${activeMerchantName}) for the current reporting day (March 2, 2026).
            
            PRIORITY STATUS: ${isP1 ? "PRIORITY 1 (CRITICAL IMPACT > 500)" : "Standard Critical Breach"}
            
            STRICT WORKFLOW & ROUTING:
            1. INITIAL TRIAGE:
               - Call getThresholdBreaches and getDeclineAnalysis to understand the scale and high-level reason for the SINGLE DAY in question.
               - ALWAYS perform "Standard Drill-downs" first: drilldownFundingType and drilldownCardBrand.
            2. ANALYSIS OF STANDARDS:
               - Evaluate the results of Standard Drill-downs. 
               - If a specific Funding Type (e.g., DEBIT) or Card Brand (e.g., VISA) accounts for >70% of declines, this is your primary driver.
            3. DEEP DIVE ROUTING (If standards don't explain the skew):
               - If no obvious skew in standards, or if ISO reason is "Generic", start technical probes:
                 - Use drilldownAuthProtocol to check 3DS health.
                 - Use drilldownBIN to find specific failing card series.
                 - Use drilldownIssuer to identify bank-side firewalls.
                 - Use drilldownSignals for fraud triggers.
            4. FINAL SYNTHESIS:
               - Mention PRECISE REASONS (fields, values, and percentage impact).
               - Structure your report for STAKEHOLDERS using Markdown: 
                 # Executive Summary
                 # Evidence & Data Findings
                 # Precise Root Cause
                 # Recommended Actions
            
            Be precise, data-driven, and technical.`;

      let messages: BaseMessage[] = [
        new SystemMessage(systemPrompt),
        new HumanMessage(`Start the investigation for Merchant ${selectedMerchant} (${activeMerchantName}).`)
      ];

      const modelWithTools = model.bindTools(functionDeclarations as any);

      let iterations = 0;
      const MAX_ITERATIONS = 12;

      while (iterations < MAX_ITERATIONS) {
        iterations++;
        const response = await modelWithTools.invoke(messages);
        messages.push(response);

        if (response.content) {
          const thought = response.content as string;
          setSteps(prev => [...prev, { thought }]);
          addLog(`Agent Thought: ${thought.substring(0, 50)}...`);
        }

        if (response.tool_calls && response.tool_calls.length > 0) {
          for (const call of response.tool_calls) {
            const result = await executeTool(call.name, call.args);
            setSteps(prev => [...prev, { thought: `Executing ${call.name}`, toolCall: call.name, result }]);
            
            messages.push(new ToolMessage({
              content: JSON.stringify(result),
              tool_call_id: call.id!,
              name: call.name,
            }));
          }
        } else if (response.content) {
          setFinalReport(response.content as string);
          addLog("Agent finished analysis.");
          break;
        } else {
          break;
        }
      }
    } catch (err) {
      console.error(err);
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-semibold uppercase tracking-wider text-xs mb-1">
              <Bot size={14} />
              AI-Powered Orchestrator
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Auth Anomaly Diagnostics</h1>
            <p className="text-slate-500 mt-1">Multi-tool agent for deep-dive decline analysis</p>
          </div>
          
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
            <div className="px-4">
              <span className="text-xs text-slate-400 block uppercase tracking-tighter">Analysis Merchant</span>
              <select 
                value={selectedMerchant}
                onChange={(e) => setSelectedMerchant(e.target.value)}
                disabled={isAnalyzing}
                className="font-medium bg-transparent border-none p-0 focus:ring-0 cursor-pointer text-sm"
              >
                {merchants.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={startAnalysis}
              disabled={isAnalyzing}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                isAnalyzing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-200'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Activity size={18} className="animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search size={18} />
                  Diagnose Anomaly
                </>
              )}
            </button>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Panel: Settings & Summary */}
          <div className="col-span-1 space-y-6">
            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                   <ShieldAlert size={14} className="text-amber-500" />
                   Target Portfolio
                </span>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-400">Single Day</span>
              </h2>
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                  <div className="text-xs text-indigo-400">Analysis Date / Merchant</div>
                  <div className="font-bold text-slate-800">March 2, 2026</div>
                  <div className="text-xs font-semibold text-indigo-600 mt-1 uppercase tracking-tighter">{activeMerchantName}</div>
                  <div className="text-xs text-indigo-400 mt-2">Merchant ID</div>
                  <div className="font-mono text-sm text-slate-600 underline">{selectedMerchant}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm text-center">
                    <div className="text-[10px] text-slate-400 uppercase">Alert / Level</div>
                    <div className={`font-bold ${isP1 ? 'text-red-600' : 'text-red-500'}`}>
                      {isP1 ? 'P1 Critical' : 'Critical'}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm text-center">
                    <div className="text-[10px] text-slate-400 uppercase">Impact Score</div>
                    <div className={`font-bold ${isP1 ? 'text-indigo-600' : 'text-slate-700'}`}>
                      {impactScore.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-[300px] flex flex-col">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                <Activity size={14} className="text-indigo-500" />
                Diagnostic Pipeline
              </h2>
              <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                {logs.length === 0 && <p className="text-xs text-slate-400 italic">Logs will appear here during analysis.</p>}
                {logs.map((log, i) => (
                  <div key={i} className="text-[10px] font-mono text-slate-500 break-all border-l-2 border-slate-100 pl-2">
                    {log}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Main Content: Agent Steps & Final Report */}
          <div className="col-span-1 lg:col-span-3 space-y-6">
            
            <AnimatePresence>
              {!steps.length && !isAnalyzing && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-indigo-600 rounded-[2rem] p-12 text-white relative overflow-hidden flex flex-col items-center text-center space-y-6"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Bot size={200} />
                  </div>
                  <div className="p-4 bg-white/10 rounded-full backdrop-blur-md">
                    <Zap size={32} />
                  </div>
                  <div className="max-w-md">
                    <h2 className="text-2xl font-bold mb-2">Ready for Investigation</h2>
                    <p className="text-indigo-100 text-sm">
                      Our coordinator agent is waiting to analyze the latest threshold breaches. 
                      It will orchestrate 8 diagnostic tools to find the root cause.
                    </p>
                  </div>
                  <button 
                    onClick={startAnalysis}
                    className="bg-white text-indigo-600 px-8 py-3 rounded-2xl font-bold hover:bg-indigo-50 transition-colors shadow-xl"
                  >
                    Engage Diagnostic Flow
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Analysis Steps */}
            <div className="space-y-4">
              {steps.map((step, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`p-5 rounded-2xl border ${step.toolCall ? 'bg-white border-indigo-100' : 'bg-slate-50 border-slate-200'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 p-2 rounded-lg ${step.toolCall ? 'bg-indigo-50 text-indigo-600' : 'bg-white text-slate-400 ring-1 ring-slate-200'}`}>
                      {step.toolCall ? <Zap size={16} /> : <Info size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 break-words">{step.thought}</div>
                      {step.toolCall && (
                        <div className="mt-3 bg-slate-50 rounded-xl p-3 border border-slate-100 overflow-x-auto">
                           <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                              <BarChart3 size={10} /> Tool Output: {step.toolCall}
                           </div>
                           <pre className="text-[10px] text-slate-600 max-h-40 overflow-y-auto">
                             {JSON.stringify(step.result, null, 2)}
                           </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {isAnalyzing && (
                <motion.div 
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="flex items-center gap-3 p-5 rounded-2xl bg-indigo-50 border border-indigo-100"
                >
                  <Activity size={18} className="text-indigo-600 animate-pulse" />
                  <span className="text-sm font-medium text-indigo-600 italic">Agent is thinking and refining analysis...</span>
                </motion.div>
              )}
            </div>

            {/* Final Report */}
            {finalReport && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-12 text-indigo-500/5 -rotate-12">
                  <FileText size={240} />
                </div>
                
                {/* Report Header */}
                <div className="p-8 md:p-12 border-b border-slate-100 bg-slate-50/50 relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex gap-4 items-center">
                      <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-lg shadow-indigo-200">
                        <BarChart3 size={28} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900 leading-tight">Diagnostic Master Report</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Confidential</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Case ID: {selectedMerchant}-{new Date().getTime().toString().slice(-6)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="px-5 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span className="text-sm font-semibold text-slate-700">Analysis Verified</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Report Body */}
                <div className="p-8 md:p-12 relative z-10">
                  <div className="max-w-4xl">
                    <div className="prose prose-indigo prose-sm sm:prose-base max-w-none 
                      prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900
                      prose-h1:text-2xl prose-h1:mb-6 prose-h1:pb-2 prose-h1:border-b-2 prose-h1:border-slate-100
                      prose-p:text-slate-600 prose-p:leading-relaxed
                      prose-strong:text-indigo-700 prose-strong:font-bold
                      prose-ul:list-disc prose-ul:pl-5 prose-li:text-slate-600">
                      <Markdown>{finalReport}</Markdown>
                    </div>
                  </div>
                </div>

                {/* Report Footer */}
                <div className="px-12 py-8 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-4 relative z-10">
                  <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100">
                    <Target size={14} /> Critical Issue Identified
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold shadow-sm">
                    <Building2 size={14} /> Portfolio Affected
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
