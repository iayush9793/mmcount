/* eslint-disable react/jsx-no-bind */
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type BreakdownItem = { template: string; count: number };
type MailCountsResponse = { totalMails: number; totalCount: number; hadData: boolean; breakdown?: BreakdownItem[] };
type FetchStatus = "idle" | "loading" | "success" | "error";

export default function Home() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Core App States
  const [date, setDate] = useState("");
  const [ets, setEts] = useState<string[]>([]);
  const [selectedEt, setSelectedEt] = useState("");
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [rawTemplates, setRawTemplates] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const [result, setResult] = useState<MailCountsResponse | null>(null);
  const [status, setStatus] = useState<FetchStatus>("idle");

  // PWA Application Installation States
  const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null);
  const [isPwaSupported, setIsPwaSupported] = useState(false);

  useEffect(() => {
    const iso = new Date().toISOString().slice(0, 10);
    setDate(iso);
    
    fetch("/api/ets")
      .then((res) => res.json())
      .then((data) => {
        setEts(data.ets ?? []);
        setTimeout(() => {
          setIsAppLoading(false);
        }, 800); 
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

  // Cascade 1: (Date + ET) -> Smarter active-only Campaign list
  useEffect(() => {
    if (!selectedEt || !date) { 
      setCampaigns([]); 
      setSelectedCampaign(""); 
      setRawTemplates([]); 
      setSelectedTemplate(""); 
      return; 
    }
    const lookupEt = selectedEt.toUpperCase().startsWith("ALL") ? "ALL" : selectedEt;
    fetch(`/api/campaigns?et=${encodeURIComponent(lookupEt)}&date=${encodeURIComponent(date)}`)
      .then((res) => res.json())
      .then((data) => {
        setCampaigns(data.campaigns ?? []);
        setSelectedCampaign("");
        setRawTemplates([]);
        setSelectedTemplate("");
      })
      .catch(() => {});
  }, [selectedEt, date]);

  // Cascade 2: Campaign -> Raw Template list fetcher
  useEffect(() => {
    if (!selectedCampaign || !selectedEt || !date) { setRawTemplates([]); return; }
    const lookupEt = selectedEt.toUpperCase().startsWith("ALL") ? "ALL" : selectedEt;
    fetch(`/api/templates?date=${date}&et=${encodeURIComponent(lookupEt)}&campaign=${encodeURIComponent(selectedCampaign)}`)
      .then((res) => res.json())
      .then((data) => {
        setRawTemplates(data.templates ?? []);
        setSelectedTemplate("");
      });
  }, [selectedCampaign, selectedEt, date]);

  const filteredTemplates = useMemo(() => {
    if (!selectedCampaign) return [];
    let searchSubstring = selectedCampaign.split("_")[0].toUpperCase(); 
    if (selectedCampaign.toUpperCase() === "ASSURITI_DB") {
      searchSubstring = "AAW";
    }
    return rawTemplates.filter((templateName) => 
      templateName.toUpperCase().includes(searchSubstring)
    );
  }, [rawTemplates, selectedCampaign]);

  const filtersReady = useMemo(() => {
    return Boolean(date && selectedEt && selectedCampaign && selectedTemplate);
  }, [date, selectedEt, selectedCampaign, selectedTemplate]);

  const currentMultiplier = useMemo(() => {
    const etUpper = selectedEt.toUpperCase();
    if (etUpper.includes("JSG 40") || etUpper.includes("JSG 38") || etUpper.includes("JSG38") || etUpper.includes("JSG40")) {
      return 2000;
    }
    return 5000;
  }, [selectedEt]);

  async function fetchCounts() {
    if (!filtersReady) return;
    setStatus("loading");
    try {
      const lookupEt = selectedEt.toUpperCase().startsWith("ALL") ? "ALL" : selectedEt;
      const res = await fetch(`/api/mailCounts?date=${date}&campaign=${encodeURIComponent(selectedCampaign)}&et=${encodeURIComponent(lookupEt)}&template=${encodeURIComponent(selectedTemplate)}`);
      const data = (await res.json()) as MailCountsResponse;

      if (data.breakdown) {
        let searchSubstring = selectedCampaign.split("_")[0].toUpperCase();
        if (selectedCampaign.toUpperCase() === "ASSURITI_DB") searchSubstring = "AAW";
        
        data.breakdown = data.breakdown.filter((item) => 
          item.template.toUpperCase().includes(searchSubstring)
        );
        data.totalMails = data.breakdown.length;
        data.totalCount = data.breakdown.reduce((sum, item) => sum + item.count, 0);
      }

      setResult(data);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    if (filtersReady) {
      fetchCounts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersReady, date, selectedEt, selectedCampaign, selectedTemplate]);

  const calculatedTotalVolume = useMemo(() => {
    if (!result) return 0;
    return result.totalCount * currentMultiplier;
  }, [result, currentMultiplier]);

  async function handleAppDownloadClick() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsPwaSupported(false);
  }

  return (
    <>
      {/* Dynamic Logo Preloader Layer Overlay */}
      {isAppLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 transition-all duration-500">
          <div className="flex flex-col items-center gap-6">
            <div className="relative h-40 w-40 animate-pulse">
              <Image src="/logo.png" alt="App Logo" fill priority className="object-contain" />
            </div>
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
              Initializing Dashboard Matrix...
            </p>
          </div>
        </div>
      )}

      {/* Main Workspace Frame Container */}
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
                  Analyze your Count of your respective account's and stacks with custom filters.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 self-end sm:self-auto">
              {/* Lamp-Style Theme Switcher */}
              <button onClick={() => setIsDarkMode(!isDarkMode)} title="Toggle Theme Lamp" className="group relative flex flex-col items-center focus:outline-none">
                <div className={`w-0.5 h-6 transition-colors duration-500 ${isDarkMode ? "bg-zinc-700 group-hover:bg-emerald-400" : "bg-slate-300 group-hover:bg-emerald-500"}`} />
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-all duration-500 transform group-active:scale-95 ${
                  isDarkMode ? "bg-zinc-800 border border-zinc-700 text-amber-400 shadow-amber-500/10" : "bg-white border border-slate-200 text-slate-400 shadow-slate-900/5"
                }`}>
                  {isDarkMode ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]">
                      <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM4 10a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 014 10zM14 10a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM5.636 5.636a.75.75 0 011.06 0l1.06 1.06a.75.75 0 11-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM12.243 12.243a.75.75 0 011.06 0l1.06 1.06a.75.75 0 11-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM5.636 14.364a.75.75 0 010-1.06l1.06-1.06a.75.75 0 111.06 1.06l-1.06 1.06a.75.75 0 01-1.06 0zM12.243 6.697a.75.75 0 010-1.06l1.06-1.06a.75.75 0 111.06 1.06l-1.06 1.06a.75.75 0 01-1.06 0zM10 6a4 4 0 100 8 4 4 0 000-8z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  )}
                </div>
              </button>

              <button 
                onClick={fetchCounts} 
                disabled={!filtersReady || status === "loading"} 
                className="rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-40 transition shrink-0 shadow-lg shadow-emerald-500/10 h-10"
              >
                {status === "loading" ? "Syncing..." : "Sync Sheet"}
              </button>
            </div>
          </header>

          {/* Filters Grid */}
          <section className={`rounded-xl p-4 sm:p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border shadow-xl transition-colors duration-500 ${
            isDarkMode ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"
          }`}>
            <div className="flex flex-col gap-1">
              <label className={`text-xs font-semibold ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`h-10 rounded-lg px-3 text-sm outline-none transition duration-500 w-full ${
                isDarkMode ? "bg-slate-950 border-zinc-800 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 border"
              }`} />
            </div>

            <div className="flex flex-col gap-1">
              <label className={`text-xs font-semibold ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>ET</label>
              <select value={selectedEt} onChange={(e) => setSelectedEt(e.target.value)} className={`h-10 rounded-lg px-3 text-sm outline-none transition duration-500 w-full ${
                isDarkMode ? "bg-slate-950 border-zinc-800 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 border"
              }`}>
                <option value="">Select ET</option>
                <option value="ALL">ALL ET'S</option>
                {ets.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className={`text-xs font-semibold ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>Campaign</label>
              <select value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)} className={`h-10 rounded-lg px-3 text-sm outline-none transition duration-500 w-full ${
                isDarkMode ? "bg-slate-950 border-zinc-800 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 border"
              }`}>
                <option value="">Select Campaign</option>
                {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className={`text-xs font-semibold ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>Template</label>
              <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} disabled={filteredTemplates.length === 0} className={`h-10 rounded-lg px-3 text-sm outline-none transition duration-500 disabled:opacity-40 w-full ${
                isDarkMode ? "bg-slate-950 border-zinc-800 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 border"
              }`}>
                <option value="">{selectedCampaign ? "Select Template" : "Select Campaign first"}</option>
                <option value="ALL">ALL TEMPLATES</option>
                {filteredTemplates.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </section>

          {/* Output Display Metrics Area */}
          {filtersReady && result && (
            <section className={`rounded-xl p-4 sm:p-6 border flex flex-col gap-6 shadow-xl transition-colors duration-500 ${
              isDarkMode ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"
            }`}>
              
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                <div className={`p-4 rounded-lg border transition-colors duration-500 ${isDarkMode ? "bg-slate-950 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                  <span className={`text-xs font-medium uppercase tracking-wide ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>Total Matched Templates</span>
                  <p className={`text-2xl font-bold mt-1 ${isDarkMode ? "text-white" : "text-slate-900"}`}>{result.totalMails}</p>
                </div>
                
                <div className={`p-4 rounded-lg border transition-colors duration-500 ${isDarkMode ? "bg-slate-950 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                  <span className={`text-xs font-medium uppercase tracking-wide ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>Total Value Tracked</span>
                  <p className="text-2xl font-bold mt-1 text-sky-500">{result.totalCount.toLocaleString()}</p>
                </div>

                <div className={`p-4 rounded-lg border transition-colors duration-500 ${isDarkMode ? "bg-slate-950 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                  <span className={`text-xs font-medium uppercase tracking-wide ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>Total Count Sum (Mails × {currentMultiplier})</span>
                  <p className="text-2xl font-bold mt-1 text-emerald-500">{calculatedTotalVolume.toLocaleString()}</p>
                </div>
              </div>

              {result.breakdown && result.breakdown.length > 0 && (
                /* Enhanced layout wrappers with overflow swiping to avoid layout squishing */
                <div className={`rounded-lg border overflow-x-auto w-full transition-colors duration-500 ${
                  isDarkMode ? "border-zinc-800 bg-slate-950" : "border-slate-200 bg-slate-50"
                }`}>
                  <table className="w-full text-left text-sm min-w-[500px]">
                    <thead className={`text-xs uppercase border-b tracking-wider transition-colors duration-500 ${
                      isDarkMode ? "bg-zinc-900 text-zinc-400 border-zinc-800" : "bg-slate-200 text-slate-600 border-slate-200"
                    }`}>
                      <tr>
                        <th className="p-3.5 pl-4 whitespace-nowrap">Template Reference</th>
                        <th className="p-3.5 text-right whitespace-nowrap">Mails Tracked</th>
                        <th className="p-3.5 pr-4 text-right text-emerald-500 whitespace-nowrap">Calculated Count</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y font-mono text-xs transition-colors duration-500 ${
                      isDarkMode ? "divide-zinc-800 text-zinc-300" : "divide-slate-200 text-slate-700"
                    }`}>
                      {result.breakdown.map((b, idx) => (
                        <tr key={idx} className={`transition-colors ${isDarkMode ? "hover:bg-zinc-900/40 text-zinc-200" : "hover:bg-slate-200/50 text-slate-800"}`}>
                          <td className="p-3.5 pl-4 font-sans font-medium whitespace-nowrap">{b.template}</td>
                          <td className="p-3.5 text-right font-semibold whitespace-nowrap">{b.count.toLocaleString()}</td>
                          <td className="p-3.5 pr-4 text-right font-bold text-emerald-500 whitespace-nowrap">{(b.count * currentMultiplier).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* PWA CTA App Banner */}
          {isPwaSupported && deferredPrompt && (
            <div className={`mt-6 rounded-2xl p-4 border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl transition-all duration-500 ${
              isDarkMode 
                ? "bg-slate-900 border-emerald-500/30 shadow-emerald-500/5" 
                : "bg-white border-emerald-500/20 shadow-slate-900/5"
            }`}>
              <div className="flex items-center gap-3 flex-col sm:flex-row text-center sm:text-left">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 15h9.75M9 19.5h6" />
                  </svg>
                </div>
                <div>
                  <h4 className={`text-sm font-bold tracking-wide ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    Mobile App Available
                  </h4>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>
                    Install this report workspace directly onto your device home screen for quick lookups.
                  </p>
                </div>
              </div>
              <button
                onClick={handleAppDownloadClick}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs tracking-wider uppercase transition-all duration-300 transform active:scale-95 shadow-md shadow-emerald-500/20 shrink-0"
              >
                Download App
              </button>
            </div>
          )}
        </div>

        <footer className={`mt-12 border-t pt-4 text-center text-xs transition-colors duration-500 w-full max-w-5xl mx-auto tracking-wide ${
          isDarkMode ? "border-white/10 text-zinc-500" : "border-slate-200 text-slate-400"
        }`}>
          © All Rights Reserved. Designed and Developed by{" "}
          <a 
            href="https://www.linkedin.com/in/ayush-srivastava-3240961b5?utm_source=share_via&utm_content=profile&utm_medium=member_android" 
            target="_blank" 
            rel="noopener noreferrer" 
            className={`font-medium transition underline underline-offset-4 ${
              isDarkMode 
                ? "text-zinc-400 hover:text-emerald-400 decoration-zinc-600 hover:decoration-emerald-400" 
                : "text-slate-600 hover:text-emerald-500 decoration-slate-300 hover:decoration-emerald-500"
            }`}
          >
            Ayush Srivastava, Full Stack Developer.
          </a>
        </footer>
      </div>
    </>
  );
}