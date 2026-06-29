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

  // Core Stage 1 States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ets, setEts] = useState<string[]>([]);
  const [selectedEt, setSelectedEt] = useState("");

  // Core Stage 2 States
  const [allFetchedData, setAllFetchedData] = useState<BreakdownItem[] | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // PWA Application Installation States
  const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null);
  const [isPwaSupported, setIsPwaSupported] = useState(false);

  useEffect(() => {
    const iso = new Date().toISOString().slice(0, 10);
    setStartDate(iso);
    setEndDate(iso);
    
    fetch("/api/ets")
      .then((res) => res.json())
      .then((data) => {
        setEts(data.ets ?? []);
        setTimeout(() => {
          setIsAppLoading(false);
        }, 500); 
      })
      .catch(() => {
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

  // Uses the preserved 'campaignSrc' field directly from the sheet columns
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

  const finalCalculatedOutput = useMemo(() => {
    if (!allFetchedData || !selectedCampaign || !selectedTemplate) return null;
    
    const rule = getFilterRule(selectedCampaign);
    let rows = allFetchedData.filter((item) => item.campaignSrc === selectedCampaign && matchTemplate(item.template, rule));
    
    if (selectedTemplate !== "ALL") {
      rows = rows.filter((item) => item.template.toLowerCase() === selectedTemplate.toLowerCase());
    }

    const totalMails = rows.length;
    const totalCount = rows.reduce((sum, item) => sum + item.count, 0);
    const calculatedVolume = rows.reduce((sum, item) => sum + (item.count * item.multiplier), 0);

    return {
      totalMails,
      totalCount,
      calculatedVolume,
      breakdown: rows
    };
  }, [allFetchedData, selectedCampaign, selectedTemplate]);

  return (
    <>
      {/* INITIAL BOOT LOADER */}
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

      {/* MATRIX CALCULATING PROGRESS SPIN LAYER */}
      {status === "loading" && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
          <div className="flex flex-col items-center gap-5 bg-slate-900 border border-white/5 p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-4 text-center">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-4 border-zinc-800" />
              <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 border-r-emerald-500 animate-spin" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">Processing Sheet Matrix</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Downloading all layout template ledgers for {selectedEt === "ALL" ? "All Accounts" : selectedEt}...
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={`min-h-screen transition-colors duration-500 p-4 sm:p-6 flex flex-col justify-between ${
        isDarkMode ? "bg-slate-950 text-zinc-50" : "bg-slate-50 text-slate-900"
      }`}>
        <div className="mx-auto max-w-5xl w-full flex flex-col gap-6 flex-1">
          
          <header className={`border-b pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
            isDarkMode ? "border-white/10" : "border-slate-200"
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <div className="relative h-20 w-48 shrink-0">
                <Image src="/logo.png" alt="Logo" fill priority className="object-contain object-left" />
              </div>
              <div className={`sm:border-l sm:py-1 sm:pl-4 ${isDarkMode ? "border-white/10 text-zinc-300" : "border-slate-200 text-slate-600"}`}>
                <p className="text-sm max-w-md font-medium leading-relaxed">
                  Select a targeted date range matrix block (max 7 days) to calculate dynamic counts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 self-end sm:set-auto">
              <button onClick={() => setIsDarkMode(!isDarkMode)} title="Toggle Theme" className="group relative flex flex-col items-center focus:outline-none">
                <div className={`w-0.5 h-6 transition-colors duration-500 ${isDarkMode ? "bg-zinc-700 group-hover:bg-emerald-400" : "bg-slate-300 group-hover:bg-emerald-500"}`} />
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-all duration-500 transform group-active:scale-95 ${
                  isDarkMode ? "bg-zinc-800 border border-zinc-700 text-amber-400 shadow-amber-500/10" : "bg-white border border-slate-200 text-slate-400 shadow-slate-900/5"
                }`}>
                  {isDarkMode ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-400">
                      <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM4 10a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 014 10zM14 10a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM5.636 5.636a.75.75 0 011.06 0l1.06 1.06a.75.75 0 11-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM12.243 12.243a.75.75 0 011.06 0l1.06 1.06a.75.75 0 11-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM5.636 14.364a.75.75 0 010-1.06l1.06-1.06a.75.75 0 111.06 1.06l-1.06 1.06a.75.75 0 01-1.06 0zM12.243 6.697a.75.75 0 010-1.06l1.06-1.06a.75.75 0 111.06 1.06l-1.06 1.06a.75.75 0 01-1.06 0zM10 6a4 4 0 100 8 4 4 0 000-8z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  )}
                </div>
              </button>
            </div>
          </header>

          <section className={`rounded-xl p-4 sm:p-6 flex flex-col gap-4 border shadow-xl transition-colors duration-500 ${
            isDarkMode ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"
          }`}>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 items-end">
              <div className="flex flex-col gap-1 w-full">
                <label className={`text-xs font-semibold ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`h-11 rounded-lg px-3 text-sm outline-none w-full ${
                  isDarkMode ? "bg-slate-950 border-zinc-800 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 border"
                }`} />
              </div>

              <div className="flex flex-col gap-1 w-full">
                <label className={`text-xs font-semibold ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`h-11 rounded-lg px-3 text-sm outline-none w-full ${
                  isDarkMode ? "bg-slate-950 border-zinc-800 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 border"
                }`} />
              </div>

              <div className="flex flex-col gap-1 w-full">
                <label className={`text-xs font-semibold ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>Select Origin Account (ET)</label>
                <select value={selectedEt} onChange={(e) => setSelectedEt(e.target.value)} className={`h-11 rounded-lg px-3 text-sm outline-none w-full ${
                  isDarkMode ? "bg-slate-950 border-zinc-800 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 border"
                }`}>
                  <option value="">Select ET Account</option>
                  <option value="ALL">ALL ET'S (Combine All Sheets)</option>
                  {ets.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>

            {errorMessage && (
              <p className="text-xs font-semibold text-rose-500 tracking-wide bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-lg">
                ⚠️ {errorMessage}
              </p>
            )}

            <button 
              onClick={handleProcessDataMatrix}
              disabled={!startDate || !endDate || !selectedEt || status === "loading"}
              className="w-full h-11 rounded-lg bg-emerald-500 hover:bg-emerald-400 font-bold text-xs uppercase tracking-wider text-white disabled:opacity-40 shadow-lg shadow-emerald-500/10 cursor-pointer transition active:scale-95 duration-150"
            >
              Process Data Matrix
            </button>
          </section>

          {allFetchedData && (
            <section className={`rounded-xl p-4 sm:p-6 grid gap-4 sm:grid-cols-2 border shadow-xl transition-all duration-500 animate-fadeIn ${
              isDarkMode ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"
            }`}>
              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>Select Campaign Group</label>
                <select value={selectedCampaign} onChange={(e) => { setSelectedCampaign(e.target.value); setSelectedTemplate(""); }} className={`h-11 rounded-lg px-3 text-sm outline-none w-full ${
                  isDarkMode ? "bg-slate-950 border-zinc-800 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 border"
                }`}>
                  <option value="">Select Campaign</option>
                  {dynamicCampaignOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>Select Target Template</label>
                <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} disabled={!selectedCampaign} className={`h-11 rounded-lg px-3 text-sm outline-none transition duration-500 disabled:opacity-40 w-full ${
                  isDarkMode ? "bg-slate-950 border-zinc-800 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 border"
                }`}>
                  <option value="">{selectedCampaign ? "Select Template" : "Choose Campaign first"}</option>
                  {dynamicTemplateOptions.length > 0 && <option value="ALL">ALL MATCHED TEMPLATES</option>}
                  {dynamicTemplateOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </section>
          )}

          {finalCalculatedOutput && (
            <section className={`rounded-xl p-4 sm:p-6 border flex flex-col gap-6 shadow-xl transition-all duration-500 animate-fadeIn ${
              isDarkMode ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"
            }`}>
              
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className={`p-4 rounded-lg border transition-colors duration-500 ${isDarkMode ? "bg-slate-950 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                  <span className={`text-xs font-medium uppercase tracking-wide ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>Total Matched Templates</span>
                  <p className={`text-2xl font-bold mt-1 ${isDarkMode ? "text-white" : "text-slate-900"}`}>{finalCalculatedOutput.totalMails}</p>
                </div>
                
                <div className={`p-4 rounded-lg border transition-colors duration-500 ${isDarkMode ? "bg-slate-950 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                  <span className={`text-xs font-medium uppercase tracking-wide ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>
                    Total Count Sum ({selectedEt.toUpperCase().startsWith("ALL") ? "Dynamic Stacks" : `Mails × ${finalCalculatedOutput.totalCount > 0 ? (finalCalculatedOutput.calculatedVolume / finalCalculatedOutput.totalCount) : 2000}`})
                  </span>
                  <p className="text-2xl font-bold mt-1 text-emerald-500">{finalCalculatedOutput.calculatedVolume.toLocaleString()}</p>
                </div>
              </div>

              {finalCalculatedOutput.breakdown.length > 0 && (
                <div className={`rounded-lg border overflow-x-auto w-full transition-colors duration-500 ${
                  isDarkMode ? "border-zinc-800 bg-slate-950" : "border-slate-200 bg-slate-50"
                }`}>
                  <table className="w-full text-left text-sm min-w-[650px]">
                    <thead className={`text-xs uppercase border-b tracking-wider transition-colors duration-500 ${
                      isDarkMode ? "bg-zinc-900 text-zinc-400 border-zinc-800" : "bg-slate-200 text-slate-600 border-slate-200"
                    }`}>
                      <tr>
                        <th className="p-3.5 pl-4 whitespace-nowrap">Template Reference</th>
                        <th className="p-3.5 whitespace-nowrap">Origin Account (ET)</th>
                        <th className="p-3.5 text-right whitespace-nowrap">Mails Tracked</th>
                        <th className="p-3.5 pr-4 text-right text-emerald-500 whitespace-nowrap">Calculated Count</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y font-mono text-xs transition-colors duration-500 ${
                      isDarkMode ? "divide-zinc-800 text-zinc-300" : "divide-slate-200 text-slate-700"
                    }`}>
                      {finalCalculatedOutput.breakdown.map((b, idx) => (
                        <tr key={idx} className={`transition-colors ${isDarkMode ? "hover:bg-zinc-900/40 text-zinc-200" : "hover:bg-slate-200/50 text-slate-800"}`}>
                          <td className="p-3.5 pl-4 font-sans font-medium whitespace-nowrap">{b.template}</td>
                          <td className="p-3.5 font-sans whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide ${
                              b.multiplier === 2000 
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                                : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                            }`}>
                              {b.etSource}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-semibold whitespace-nowrap">{b.count.toLocaleString()}</td>
                          <td className="p-3.5 pr-4 text-right font-bold text-emerald-500 whitespace-nowrap">{(b.count * b.multiplier).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
