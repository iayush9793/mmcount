/* eslint-disable react/jsx-no-bind */
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type BreakdownItem = { template: string; campaignSrc: string; etSource: string; count: number; multiplier: number };
type MailCountsResponse = { totalMails: number; totalCount: number; calculatedVolume: number; hadData: boolean; breakdown?: BreakdownItem[] };
type FetchStatus = "idle" | "loading" | "success" | "error";

interface FilterRule {
  includes: string[];
  excludes: string[];
}

export default function Home() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Core Stage 1 Input States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ets, setEts] = useState<string[]>([]);
  const [selectedEt, setSelectedEt] = useState("");

  // Automation / Dashboard Summary States
  const [dashboardData, setDashboardData] = useState<BreakdownItem[] | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);

  // Custom Range Query States
  const [allFetchedData, setAllFetchedData] = useState<BreakdownItem[] | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Interactive Popup Modal State
  const [selectedCardAccount, setSelectedCardAccount] = useState<string | null>(null);

  // PWA States
  const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null);
  const [isPwaSupported, setIsPwaSupported] = useState(false);

  // Core Initial Boot Loader & Auto-Dashboard Sync
  useEffect(() => {
    const iso = new Date().toISOString().slice(0, 10);
    setStartDate(iso);
    setEndDate(iso);
    
    setIsDashboardLoading(true);
    
    fetch("/api/ets")
      .then((res) => res.json())
      .then((data) => {
        const structuralTabs = data.ets ?? [];
        setEts(structuralTabs);
        return fetch(`/api/mailCounts?startDate=${iso}&endDate=${iso}&et=ALL`);
      })
      .then((res) => res ? res.json() : null)
      .then((data) => {
        if (data && data.breakdown) {
          setDashboardData(data.breakdown);
        }
        setIsDashboardLoading(false);
        setIsAppLoading(false);
      })
      .catch(() => {
        setIsDashboardLoading(false);
        setIsAppLoading(false);
      });

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsPwaSupported(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const getFilterRule = (campaignName: string): FilterRule => {
    const cleanCamp = campaignName.toUpperCase().trim();
    
    if (cleanCamp === "RGR") return { includes: ["RGR"], excludes: [] };
    if (cleanCamp === "ICO") return { includes: ["ICO"], excludes: [] };
    if (cleanCamp === "AHS_AD") return { includes: ["AHS"], excludes: ["DB", "XCE", "GZ", "XC", "ES"] };
    if (cleanCamp === "SHW_ES") return { includes: ["SHW", "ES"], excludes: ["DB", "XCE", "GZ", "XC"] };
    if (cleanCamp === "XCE_AIR" || cleanCamp === "AIR") return { includes: ["AIR"], excludes: [] };
    if (cleanCamp === "FIR_XC") return { includes: ["FIR"], excludes: [] };
    if (cleanCamp === "HEC_AD") return { includes: ["HEC"], excludes: [] };
    if (cleanCamp === "INSURIFY_GZ") return { includes: ["IA"], excludes: ["IAI"] };
    if (cleanCamp === "LR_GZ") return { includes: ["LR"], excludes: [] };
    if (cleanCamp.includes("E-VETERANS_DB") || cleanCamp.includes("VETERANS_DB")) return { includes: ["EVL"], excludes: [] };
    if (cleanCamp === "FGLO_DB") return { includes: ["FGLO"], excludes: [] };
    if (cleanCamp === "ADT_AD") return { includes: ["ADT"], excludes: ["DB", "XCE", "GZ", "XC"] };
    if (cleanCamp.includes("RYH FLOORING") || cleanCamp.includes("RYH_FLOORING")) return { includes: ["RHF"], excludes: ["DB", "XCE", "GZ", "XC"] };
    if (cleanCamp === "JG_AD") return { includes: ["JG"], excludes: ["DB", "XCE", "GZ", "XC"] };
    if (cleanCamp === "ZBH_DB") return { includes: ["ZBH", "DB"], excludes: ["XCE", "GZ", "XC", "ES"] };
    if (cleanCamp === "CH_XC") return { includes: ["CH"], excludes: [] };
    if (cleanCamp === "LBH_DB") return { includes: ["LBH", "DB"], excludes: ["XCE", "GZ", "XC", "ES"] };
    if (cleanCamp === "NDR_GZ") return { includes: ["NDR", "GZ"], excludes: ["XCE", "XC", "ES"] };
    if (cleanCamp === "VIVINT_AD" || cleanCamp === "VIVINT") return { includes: ["VI"], excludes: ["XCE", "XC", "ES", "GZ", "DB"] };
    if (cleanCamp === "TRUGREEN_AD") return { includes: ["TRU"], excludes: ["XCE", "XC", "ES", "GZ", "DB"] };
    if (cleanCamp.includes("IAI_GZ")) return { includes: ["IAI"], excludes: [] };
    if (cleanCamp === "RBA_XCE") return { includes: ["RBA", "XCE"], excludes: ["XC", "ES", "GZ", "DB"] };
    if (cleanCamp === "JG_XCE") return { includes: ["JG", "XCE"], excludes: ["XC", "ES", "GZ", "DB"] };
    if (cleanCamp === "TRUGREEN_DB") return { includes: ["TRU", "DB"], excludes: ["XC", "ES", "GZ", "XCE"] };
    if (cleanCamp === "ASSURITI_DB") return { includes: ["AAW"], excludes: [] };
    if (cleanCamp === "QUOTIFII_DB") return { includes: ["QTI"], excludes: [] };

    return { includes: [cleanCamp.split("_")[0]], excludes: [] };
  };

  const matchTemplate = (templateName: string, rule: FilterRule): boolean => {
    const tmplUpper = templateName.toUpperCase();
    const matchesIncludes = rule.includes.every(inc => tmplUpper.includes(inc));
    const triggersExcludes = rule.excludes.some(exc => tmplUpper.includes(exc));
    return matchesIncludes && !triggersExcludes;
  };

  const topFiveCampaignsSummary = useMemo(() => {
    if (!dashboardData) return [];
    const aggregated = new Map<string, number>();
    dashboardData.forEach((item) => {
      const vol = item.count * item.multiplier;
      aggregated.set(item.campaignSrc, (aggregated.get(item.campaignSrc) || 0) + vol);
    });
    return Array.from(aggregated.entries())
      .map(([name, totalVol]) => ({ name, volume: totalVol }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);
  }, [dashboardData]);

  const dashboardAccountWiseMetrics = useMemo(() => {
    if (!dashboardData) return [];
    const accountsMap = new Map<string, { totalMails: number; calculatedVolume: number }>();
    dashboardData.forEach((item) => {
      const existing = accountsMap.get(item.etSource) || { totalMails: 0, calculatedVolume: 0 };
      accountsMap.set(item.etSource, {
        totalMails: existing.totalMails + item.count,
        calculatedVolume: existing.calculatedVolume + (item.count * item.multiplier),
      });
    });
    return Array.from(accountsMap.entries()).map(([account, meta]) => ({ account, ...meta }));
  }, [dashboardData]);

  const dashboardCampaignWiseMetrics = useMemo(() => {
    if (!dashboardData) return [];
    const campaignsMap = new Map<string, { totalMails: number; calculatedVolume: number }>();
    dashboardData.forEach((item) => {
      const existing = campaignsMap.get(item.campaignSrc) || { totalMails: 0, calculatedVolume: 0 };
      campaignsMap.set(item.campaignSrc, {
        totalMails: existing.totalMails + item.count,
        calculatedVolume: existing.calculatedVolume + (item.count * item.multiplier),
      });
    });
    return Array.from(campaignsMap.entries()).map(([campaign, meta]) => ({ campaign, ...meta }));
  }, [dashboardData]);

  async function handleProcessDataMatrix() {
    if (!startDate || !endDate || !selectedEt) return;
    setErrorMessage("");

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (end < start) {
      setErrorMessage("End Date cannot be earlier than Start Date.");
      return;
    }

    if (diffDays > 7) {
      setErrorMessage(`Selected range is ${diffDays} days. Maximum allowed range is 7 days.`);
      return;
    }

    setStatus("loading");
    setAllFetchedData(null);
    setSelectedCampaign("");
    setSelectedTemplate("");
    setSelectedCardAccount(null);
    
    try {
      const lookupEt = selectedEt.toUpperCase().startsWith("ALL") ? "ALL" : selectedEt;
      const res = await fetch(`/api/mailCounts?startDate=${startDate}&endDate=${endDate}&et=${encodeURIComponent(lookupEt)}`);
      const data = (await res.json()) as MailCountsResponse;
      
      setAllFetchedData(data.breakdown ?? []);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  const dynamicCampaignOptions = useMemo(() => {
    if (!allFetchedData) return [];
    const uniqueCamps = new Set<string>();
    allFetchedData.forEach((item) => {
      if (item.campaignSrc) uniqueCamps.add(item.campaignSrc);
    });
    return Array.from(uniqueCamps).sort((a, b) => a.localeCompare(b));
  }, [allFetchedData]);

  const dynamicTemplateOptions = useMemo(() => {
    if (!allFetchedData || !selectedCampaign) return [];
    const rule = getFilterRule(selectedCampaign);
    const options = allFetchedData
      .filter((item) => item.campaignSrc === selectedCampaign && matchTemplate(item.template, rule))
      .map((item) => item.template);
      
    return Array.from(new Set(options)).sort((a, b) => a.localeCompare(b));
  }, [allFetchedData, selectedCampaign]);

  // Filters the complete matching rows base for the selection card layout matrix
  const currentFilteredBaseRows = useMemo(() => {
    if (!allFetchedData || !selectedCampaign || !selectedTemplate) return [];
    const rule = getFilterRule(selectedCampaign);
    let rows = allFetchedData.filter((item) => item.campaignSrc === selectedCampaign && matchTemplate(item.template, rule));
    
    if (selectedTemplate !== "ALL") {
      rows = rows.filter((item) => item.template.toLowerCase() === selectedTemplate.toLowerCase());
    }
    return rows;
  }, [allFetchedData, selectedCampaign, selectedTemplate]);

  // Aggregated splits for rendering individual card values overview
  const processedAccountWiseCards = useMemo(() => {
    const cardsMap = new Map<string, { totalMails: number; totalVolume: number }>();
    currentFilteredBaseRows.forEach((item) => {
      const existing = cardsMap.get(item.etSource) || { totalMails: 0, totalVolume: 0 };
      cardsMap.set(item.etSource, {
        totalMails: existing.totalMails + item.count,
        totalVolume: existing.totalVolume + (item.count * item.multiplier),
      });
    });
    return Array.from(cardsMap.entries()).map(([account, meta]) => ({ account, ...meta }));
  }, [currentFilteredBaseRows]);

  // Computes the structural breakdown lists of individual templates matching the active clicked card pop up target
  const modalTemplatesBreakdownList = useMemo(() => {
    if (!selectedCardAccount) return [];
    return currentFilteredBaseRows.filter(row => row.etSource === selectedCardAccount);
  }, [selectedCardAccount, currentFilteredBaseRows]);

  return (
    <>
      {/* INITIAL BOOT LAYER */}
      {isAppLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950">
          <div className="flex flex-col items-center gap-6">
            <div className="relative h-40 w-40 animate-pulse">
              <Image src="/logo.png" alt="App Logo" fill priority className="object-contain" />
            </div>
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
              Initializing Dashboard Matrix...
            </p>
          </div>
        </div>
      )}

      {/* SYNC RUNTIME PROGRESS DISPLAY */}
      {status === "loading" && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
          <div className="flex flex-col items-center gap-5 bg-slate-900 border border-white/5 p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-4 text-center">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-4 border-zinc-800" />
              <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 border-r-emerald-500 animate-spin" />
            </div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">Processing Data Matrix</h3>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* POPUP MODAL COMPONENT LAYER: Template breakdown of clicked card */}
      {/* ========================================================= */}
      {selectedCardAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl p-6 flex flex-col max-h-[85vh] transition-colors ${
            isDarkMode ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800/60 mb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">
                  📋 Account Reference: {selectedCardAccount}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Live items tracking breakdown ledger</p>
              </div>
              <button onClick={() => setSelectedCardAccount(null)} className="h-8 px-3 rounded-lg bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition">
                Close
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-zinc-800/50 pr-1 font-mono text-xs">
              {modalTemplatesBreakdownList.map((item, index) => (
                <div key={index} className="py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="flex flex-col max-w-[70%]">
                    <span className="font-sans font-semibold text-zinc-200 break-all">{item.template}</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wide">Campaign: {item.campaignSrc}</span>
                  </div>
                  <div className="flex items-center gap-4 justify-between sm:justify-end shrink-0">
                    <div className="text-right">
                      <span className="text-zinc-400 block text-[10px] uppercase font-bold">Mails</span>
                      <span className="font-bold text-zinc-300 text-sm">{item.count.toLocaleString()}</span>
                    </div>
                    <div className="text-right min-w-[90px]">
                      <span className="text-emerald-500 block text-[10px] uppercase font-bold">Volume</span>
                      <span className="font-black text-emerald-400 text-sm">{(item.count * item.multiplier).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={`min-h-screen transition-colors duration-500 p-4 sm:p-6 flex flex-col justify-between ${
        isDarkMode ? "bg-slate-950 text-zinc-50" : "bg-slate-50 text-slate-900"
      }`}>
        <div className="mx-auto max-w-5xl w-full flex flex-col gap-6 flex-1">
          
          <header className={`border-b pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isDarkMode ? "border-white/10" : "border-slate-200"}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <div className="relative h-20 w-48 shrink-0">
                <Image src="/logo.png" alt="Logo" fill priority className="object-contain object-left" />
              </div>
              <div className="text-zinc-400 text-sm font-medium">
                Live Campaign Matrix Workspace
              </div>
            </div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-full border border-zinc-800 hover:bg-zinc-900 transition text-xs font-bold">
              {isDarkMode ? "🌙 Dark" : "☀️ Light"}
            </button>
          </header>

          {/* ========================================================= */}
          {/* SECTION A: AUTOMATED DASHBOARD SYSTEM SUMMARY LAYER       */}
          {/* ========================================================= */}
          {!allFetchedData && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              
              <section className={`rounded-xl p-4 sm:p-6 border shadow-xl ${isDarkMode ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500 mb-4">
                  🔥 Top 5 Active Campaigns Going with Highest Volume (Today)
                </h3>
                {isDashboardLoading ? (
                  <div className="h-12 flex items-center justify-center text-xs text-zinc-400 font-medium">Syncing live dashboard summaries...</div>
                ) : topFiveCampaignsSummary.length === 0 ? (
                  <div className="h-12 flex items-center justify-center text-xs text-zinc-500">No active counts found for current date.</div>
                ) : (
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-5">
                    {topFiveCampaignsSummary.map((item, index) => (
                      <div key={item.name} className={`p-3 rounded-lg border flex flex-col ${isDarkMode ? "bg-slate-950 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Rank #{index + 1}</span>
                        <span className="text-xs font-bold truncate mt-0.5" title={item.name}>{item.name}</span>
                        <span className="text-sm font-black text-emerald-400 mt-1">{item.volume.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                <section className={`rounded-xl p-4 sm:p-6 border shadow-xl ${isDarkMode ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-3">📋 Section 1: Account Wise Track Volume</h3>
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-zinc-800/40 font-mono text-xs pr-2">
                    {dashboardAccountWiseMetrics.map((item) => (
                      <div key={item.account} className="py-2.5 flex justify-between items-center gap-2">
                        <span className="font-sans font-medium text-zinc-300 truncate">{item.account}</span>
                        <span className="font-bold text-sky-400 shrink-0">{item.calculatedVolume.toLocaleString()} <span className="text-[10px] text-zinc-500 font-normal">({item.totalMails} mails)</span></span>
                      </div>
                    ))}
                    {dashboardAccountWiseMetrics.length === 0 && <p className="text-zinc-500 text-center py-4">No account metrics available.</p>}
                  </div>
                </section>

                <section className={`rounded-xl p-4 sm:p-6 border shadow-xl ${isDarkMode ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3">📊 Section 2: Campaign Wise Track Volume</h3>
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-zinc-800/40 font-mono text-xs pr-2">
                    {dashboardCampaignWiseMetrics.map((item) => (
                      <div key={item.campaign} className="py-2.5 flex justify-between items-center gap-2">
                        <span className="font-sans font-medium text-zinc-300 truncate">{item.campaign}</span>
                        <span className="font-bold text-purple-400 shrink-0">{item.calculatedVolume.toLocaleString()} <span className="text-[10px] text-zinc-500 font-normal">({item.totalMails} mails)</span></span>
                      </div>
                    ))}
                    {dashboardCampaignWiseMetrics.length === 0 && <p className="text-zinc-500 text-center py-4">No campaign metrics available.</p>}
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* CORE WORKSPACE FILTER CONTROLS BAR                        */}
          {/* ========================================================= */}
          <section className={`rounded-xl p-4 sm:p-6 flex flex-col gap-4 border shadow-xl ${isDarkMode ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-400">Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`h-11 rounded-lg px-3 text-sm outline-none w-full ${isDarkMode ? "bg-slate-950 border-zinc-800 text-white" : "bg-slate-50 border-slate-200"}`} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-400">End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`h-11 rounded-lg px-3 text-sm outline-none w-full ${isDarkMode ? "bg-slate-950 border-zinc-800 text-white" : "bg-slate-50 border-slate-200"}`} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-400">Origin Account (ET)</label>
                <select value={selectedEt} onChange={(e) => setSelectedEt(e.target.value)} className={`h-11 rounded-lg px-3 text-sm outline-none w-full ${isDarkMode ? "bg-slate-950 border-zinc-800 text-white" : "bg-slate-50 border-slate-200"}`}>
                  <option value="">Select ET Account</option>
                  <option value="ALL">ALL ET'S (All Sheets)</option>
                  {ets.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>

            {errorMessage && <p className="text-xs font-semibold text-rose-500 bg-rose-500/5 p-2.5 rounded-lg border border-rose-500/10">⚠️ {errorMessage}</p>}

            <button onClick={handleProcessDataMatrix} disabled={!startDate || !endDate || !selectedEt || status === "loading"} className="w-full h-11 rounded-lg bg-emerald-500 hover:bg-emerald-400 font-bold text-xs uppercase tracking-wider text-white disabled:opacity-40 shadow-lg cursor-pointer transition active:scale-95 duration-150">
              Process Data Matrix
            </button>
          </section>

          {/* ========================================================= */}
          {/* SECTION B: SPECIFIC ACTION RESULTS SCREEN OVERVIEW         */}
          {/* ========================================================= */}
          {allFetchedData && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              
              <section className={`rounded-xl p-4 sm:p-6 grid gap-4 sm:grid-cols-2 border shadow-xl ${isDarkMode ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-zinc-400">Select Campaign Group</label>
                  <select value={selectedCampaign} onChange={(e) => { setSelectedCampaign(e.target.value); setSelectedTemplate(""); }} className={`h-11 rounded-lg px-3 text-sm outline-none w-full ${isDarkMode ? "bg-slate-950 border-zinc-800 text-white" : "bg-slate-50 border-slate-200"}`}>
                    <option value="">Select Campaign</option>
                    {dynamicCampaignOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-zinc-400">Select Target Template</label>
                  <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} disabled={!selectedCampaign} className={`h-11 rounded-lg px-3 text-sm outline-none w-full ${isDarkMode ? "bg-slate-950 border-zinc-800 text-white" : "bg-slate-50 border-slate-200"}`}>
                    <option value="">{selectedCampaign ? "Select Template" : "Choose Campaign first"}</option>
                    {dynamicTemplateOptions.length > 0 && <option value="ALL">ALL MATCHED TEMPLATES</option>}
                    {dynamicTemplateOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </section>

              {selectedCampaign && selectedTemplate && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">📌 Account Summary Split Cards (Click to see Templates)</h4>
                    <button onClick={() => setAllFetchedData(null)} className="text-xs font-semibold text-emerald-500 hover:underline">← Clear View Back to Dashboard</button>
                  </div>
                  
                  {/* Grid displaying cards */}
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                    {processedAccountWiseCards.map((card) => (
                      <div 
                        key={card.account} 
                        onClick={() => setSelectedCardAccount(card.account)}
                        className={`p-4 rounded-xl border shadow-md flex flex-col justify-between cursor-pointer transform transition hover:scale-[1.03] hover:shadow-lg duration-200 group ${
                          isDarkMode ? "bg-slate-900 border-white/5 hover:border-emerald-500/30" : "bg-white border-slate-200 hover:border-emerald-500/40"
                        }`}
                      >
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-200">
                            {card.account}
                          </span>
                          <p className="text-xs text-zinc-400 font-medium">Total Mails Match Row</p>
                          <p className="text-xl font-bold tracking-tight mt-0.5 text-zinc-200">{card.totalMails.toLocaleString()} <span className="text-xs text-zinc-500 font-normal">Mails</span></p>
                        </div>
                        <div className="mt-4 border-t border-zinc-800/60 pt-2 flex justify-between items-baseline">
                          <span className="text-[10px] uppercase font-bold text-zinc-500">Calculated Volume</span>
                          <span className="text-base font-black text-sky-400 group-hover:text-emerald-400 transition-colors duration-200">{card.totalVolume.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                    {processedAccountWiseCards.length === 0 && (
                      <div className="p-6 border rounded-xl border-dashed border-zinc-800 text-center text-xs text-zinc-500 col-span-full">
                        No parameters match this criteria combination grid. Try broadening selections.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
