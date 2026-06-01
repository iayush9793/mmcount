/* eslint-disable react/jsx-no-bind */
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type BreakdownItem = { template: string; count: number };
type MailCountsResponse = { totalMails: number; totalCount: number; hadData: boolean; breakdown?: BreakdownItem[] };
type FetchStatus = "idle" | "loading" | "success" | "error";

export default function Home() {
  // Application Loading State for Preloader
  const [isAppLoading, setIsAppLoading] = useState(true);

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

  // Dismiss the preloader screen after critical initial elements load
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

  // Prefix naming convention mapping system
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

  const structuralTotalCountSum = useMemo(() => {
    if (!result) return 0;
    return result.totalCount * 5000;
  }, [result]);

  return (
    <>
      {/* Dynamic Logo Preloader Layer Overlay */}
      {isAppLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 transition-all duration-500">
          <div className="flex flex-col items-center gap-6">
            {/* Expanded Big Preloader Logo Frame */}
            <div className="relative h-40 w-40 animate-pulse">
              <Image
                src="/logo.png"
                alt="App Logo"
                fill
                priority
                className="object-contain"
              />
            </div>
            {/* Spinning Indicator Element */}
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
              Initializing Dashboard Matrix...
            </p>
          </div>
        </div>
      )}

      {/* Main Workspace Frame Container */}
      <div className="min-h-screen bg-slate-950 text-zinc-50 p-6">
        <div className="mx-auto max-w-5xl flex flex-col gap-6">
          <header className="border-b border-white/10 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              {/* Massive Layout Custom Logo Placement replacing text title */}
              <div className="relative h-20 w-48 shrink-0">
                <Image src="/logo.png" alt="Logo" fill priority className="object-contain object-left" />
              </div>
              <div className="sm:border-l sm:border-white/10 sm:pl-4 sm:py-1">
                {/* Updated Target Description Content Header */}
                <p className="text-sm text-zinc-300 max-w-md font-medium leading-relaxed">
                  Analyze your Count of your respective account's and stacks with custom filters.
                </p>
              </div>
            </div>
            <button 
              onClick={fetchCounts} 
              disabled={!filtersReady || status === "loading"} 
              className="rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-40 transition shrink-0 shadow-lg shadow-emerald-500/10"
            >
              {status === "loading" ? "Syncing..." : "Sync Sheet"}
            </button>
          </header>

          {/* Filters Grid */}
          <section className="bg-slate-900 rounded-xl p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border border-white/5 shadow-xl">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-400">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 rounded-lg bg-slate-950 border border-zinc-800 px-3 text-sm text-white outline-none focus:border-emerald-500 transition" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-400">ET</label>
              <select value={selectedEt} onChange={(e) => setSelectedEt(e.target.value)} className="h-10 rounded-lg bg-slate-950 border border-zinc-800 px-3 text-sm text-white outline-none focus:border-emerald-500 transition">
                <option value="">Select ET</option>
                <option value="ALL">ALL ET'S</option>
                {ets.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-400">Campaign</label>
              <select value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)} className="h-10 rounded-lg bg-slate-950 border border-zinc-800 px-3 text-sm text-white outline-none focus:border-emerald-500 transition">
                <option value="">Select Campaign</option>
                {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-400">Template</label>
              <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} disabled={filteredTemplates.length === 0} className="h-10 rounded-lg bg-slate-950 border border-zinc-800 px-3 text-sm text-white outline-none focus:border-emerald-500 transition disabled:opacity-40">
                <option value="">{selectedCampaign ? "Select Template" : "Select Campaign first"}</option>
                <option value="ALL">ALL TEMPLATES</option>
                {filteredTemplates.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </section>

          {/* Output Display Metrics Table UI */}
          {filtersReady && result && (
            <section className="bg-slate-900 rounded-xl p-6 border border-white/5 flex flex-col gap-6 shadow-xl">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="bg-slate-950 p-4 rounded-lg border border-zinc-800">
                  <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Total Matched Templates</span>
                  <p className="text-2xl font-bold mt-1 text-white">{result.totalMails}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-zinc-800">
                  <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Total Count Sum (Mails × 5000)</span>
                  <p className="text-2xl font-bold mt-1 text-emerald-400">{structuralTotalCountSum.toLocaleString()}</p>
                </div>
              </div>

              {result.breakdown && result.breakdown.length > 0 && (
                <div className="rounded-lg border border-zinc-800 overflow-hidden bg-slate-950">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-900 text-zinc-400 text-xs uppercase border-b border-zinc-800 tracking-wider">
                      <tr>
                        <th className="p-3.5 pl-4">Template Reference</th>
                        <th className="p-3.5 text-right">Mails Tracked</th>
                        <th className="p-3.5 pr-4 text-right text-emerald-400">Calculated Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 font-mono text-xs text-zinc-300">
                      {result.breakdown.map((b, idx) => (
                        <tr key={idx} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="p-3.5 pl-4 font-sans text-zinc-200 font-medium">{b.template}</td>
                          <td className="p-3.5 text-right text-zinc-100 font-semibold">{b.count.toLocaleString()}</td>
                          <td className="p-3.5 pr-4 text-right font-bold text-emerald-400">{(b.count * 5000).toLocaleString()}</td>
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