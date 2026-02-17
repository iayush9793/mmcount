/* eslint-disable react/jsx-no-bind */
"use client";

import { useEffect, useMemo, useState } from "react";

type MailCountsResponse = {
  totalMails: number;
  totalCount: number;
  hadData: boolean;
};

type FetchStatus = "idle" | "loading" | "success" | "error";

type OverviewCard = {
  et: string;
  totalMails: number;
  totalCount: number;
  hadData: boolean;
};

export default function Home() {
  const [todayIso, setTodayIso] = useState("");
  const [date, setDate] = useState("");
  const [ets, setEts] = useState<string[]>([]);
  const [selectedEt, setSelectedEt] = useState("");
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");

  const [result, setResult] = useState<MailCountsResponse | null>(null);
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [overviewCards, setOverviewCards] = useState<OverviewCard[]>([]);
  const [overviewStatus, setOverviewStatus] = useState<FetchStatus>("idle");
  const [overviewError, setOverviewError] = useState("");

  // Initialize today's date on the client only to avoid hydration mismatch.
  useEffect(() => {
    const iso = new Date().toISOString().slice(0, 10);
    setTodayIso(iso);
    setDate((prev) => prev || iso);
  }, []);

  const filtersReady = useMemo(
    () => Boolean(date && selectedEt && selectedCampaign),
    [date, selectedEt, selectedCampaign],
  );

  // Load ET list on mount.
  useEffect(() => {
    async function loadEts() {
      try {
        const res = await fetch("/api/ets");
        if (!res.ok) throw new Error("Failed to load ET list");
        const data = (await res.json()) as { ets: string[] };
        const allEts = data.ets ?? [];
        setEts(allEts);
      } catch (error) {
        console.error(error);
        setErrorMessage("Unable to load ET list from Google Sheets.");
      }
    }

    loadEts();
  }, []);

  // Load campaigns whenever ET changes.
  useEffect(() => {
    async function loadCampaigns() {
      if (!selectedEt) {
        setCampaigns([]);
        setSelectedCampaign("");
        return;
      }

      try {
        const params = new URLSearchParams({
          et:
            selectedEt.trim().toUpperCase() === "ALL" ||
            selectedEt.trim().toUpperCase().startsWith("ALL ET")
              ? "ALL"
              : selectedEt,
        });
        const res = await fetch(`/api/campaigns?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load campaign list");
        const data = (await res.json()) as { campaigns: string[] };
        setCampaigns(data.campaigns ?? []);
        setSelectedCampaign("");
      } catch (error) {
        console.error(error);
        setErrorMessage("Unable to load campaign list from Google Sheets.");
      }
    }

    loadCampaigns();
  }, [selectedEt]);

  async function fetchCounts() {
    if (!filtersReady) return;
    setStatus("loading");
    setErrorMessage("");

    try {
      const params = new URLSearchParams({
        date,
        campaign: selectedCampaign,
        et:
          selectedEt.trim().toUpperCase() === "ALL" ||
          selectedEt.trim().toUpperCase().startsWith("ALL ET")
            ? "ALL"
            : selectedEt,
      });

      const res = await fetch(`/api/mailCounts?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch mail counts");
      }

      const data = (await res.json()) as MailCountsResponse;
      setResult(data);
      setStatus("success");
      setLastUpdated(new Date());
    } catch (error) {
      console.error(error);
      setStatus("error");
      setErrorMessage("Unable to fetch mail counts. Please try again.");
    }
  }

  // Auto-refresh every 30 seconds when filters are ready.
  useEffect(() => {
    if (!filtersReady) return;

    void fetchCounts();

    const id = setInterval(() => {
      void fetchCounts();
    }, 30_000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersReady, date, selectedEt, selectedCampaign]);

  function handleManualSync() {
    void fetchCounts();
  }

  const showResultCard = filtersReady && result !== null;

  const allEtOptions = useMemo(() => {
    const existing = ets ?? [];
    const hasAll = existing.some(
      (et) => et.trim().toUpperCase() === "ALL ET'S" || et.trim().toUpperCase() === "ALL",
    );
    const base = hasAll ? existing : ["ALL ET'S", ...existing];
    return base;
  }, [ets]);

  // Overview for today: first 5 ETs, RGR campaign.
  useEffect(() => {
    async function loadOverview() {
      if (!todayIso || !ets || ets.length === 0) return;

      setOverviewStatus("loading");
      setOverviewError("");

      const sampleEts = ets.slice(0, 5);

      try {
        const results = await Promise.all(
          sampleEts.map(async (et) => {
            const params = new URLSearchParams({
              date: todayIso,
              campaign: "RGR",
              et,
            });
            const res = await fetch(`/api/mailCounts?${params.toString()}`);
            if (!res.ok) {
              return {
                et,
                totalMails: 0,
                totalCount: 0,
                hadData: false,
              };
            }
            const data = (await res.json()) as MailCountsResponse;
            return {
              et,
              totalMails: data.totalMails,
              totalCount: data.totalCount,
              hadData: data.hadData,
            };
          }),
        );

        setOverviewCards(results);
        setOverviewStatus("success");
      } catch (error) {
        console.error(error);
        setOverviewStatus("error");
        setOverviewError("Unable to load today overview for RGR.");
      }
    }

    void loadOverview();
  }, [ets, todayIso]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-zinc-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-6 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        {/* Navbar */}
        <header className="sticky top-0 z-20 mb-6 flex flex-col gap-3 border-b border-white/10 bg-slate-950/80 pb-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:pb-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              MM-COUNT REPORT ANALYZER
            </h1>
            <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
              Smart overview of campaign mail volume across ET&apos;s.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={!filtersReady || status === "loading"}
              className="inline-flex items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-500/90 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:py-2 sm:text-sm"
            >
              {status === "loading" ? "Syncing..." : "Sync Sheet"}
            </button>
            <DownloadPwaButton />
          </div>
        </header>

        {/* Filters + results */}
        <main className="flex flex-1 flex-col gap-5">
          <section className="rounded-2xl bg-slate-900/80 p-4 shadow-lg ring-1 ring-white/5 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Filters
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="date" className="text-xs font-medium text-zinc-200 sm:text-sm">
                  Date
                </label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9 rounded-lg border border-slate-600 bg-slate-950 px-2 text-xs text-zinc-100 outline-none ring-0 transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 sm:h-10 sm:px-3 sm:text-sm"
                />
              </div>

              {/* ET */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="et" className="text-xs font-medium text-zinc-200 sm:text-sm">
                  ET
                </label>
                <select
                  id="et"
                  value={selectedEt}
                  onChange={(e) => setSelectedEt(e.target.value)}
                  className="h-9 rounded-lg border border-slate-600 bg-slate-950 px-2 text-xs text-zinc-100 outline-none ring-0 transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 sm:h-10 sm:px-3 sm:text-sm"
                >
                  <option value="">Select ET</option>
                  {allEtOptions.map((et) => (
                    <option key={et} value={et}>
                      {et}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campaign */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="campaign"
                  className="text-xs font-medium text-zinc-200 sm:text-sm"
                >
                  Campaign
                </label>
                <select
                  id="campaign"
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  disabled={campaigns.length === 0}
                  className="h-9 rounded-lg border border-slate-600 bg-slate-950 px-2 text-xs text-zinc-100 outline-none ring-0 transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-800 sm:h-10 sm:px-3 sm:text-sm"
                >
                  <option value="">
                    {selectedEt ? "Select Campaign" : "Select ET first"}
                  </option>
                  {campaigns.map((campaign) => (
                    <option key={campaign} value={campaign}>
                      {campaign}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {errorMessage && (
              <p className="mt-4 text-xs text-red-400 sm:text-sm">{errorMessage}</p>
            )}
          </section>

          {/* Result card - hidden until filters are selected */}
          {showResultCard && result && (
            <section className="rounded-2xl bg-slate-900/80 p-4 shadow-lg ring-1 ring-white/5 sm:p-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                Summary
              </h2>
              <div className="flex flex-col gap-2 text-sm sm:text-base">
                <p>
                  <span className="font-medium">Total no. of mails - </span>
                  {result.totalMails}
                </p>
                <p>
                  <span className="font-medium">Total count = </span>
                  {result.totalCount.toLocaleString()}
                </p>
                {!result.hadData && (
                  <p className="text-xs text-zinc-400 sm:text-sm">
                    No data found for this combination. Showing zero values.
                  </p>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-1 text-xs text-zinc-400 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
                <span>
                  Date:{" "}
                  <span className="font-medium">
                    {date || "-"}
                  </span>
                </span>
                <span>
                  ET: <span className="font-medium">{selectedEt}</span> • Campaign:{" "}
                  <span className="font-medium">{selectedCampaign}</span>
                </span>
              </div>

              {lastUpdated && (
                <p className="mt-2 text-xs text-zinc-500 sm:text-sm">
                  Last updated at {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </section>
          )}

          {/* Today overview section */}
          <section className="rounded-2xl bg-slate-900/70 p-4 shadow-lg ring-1 ring-white/5 sm:p-6">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                  Today overview (RGR)
                </h2>
                <p className="text-xs text-zinc-500 sm:text-sm">
                  Quick snapshot of today&apos;s RGR mails across a few ET&apos;s.
                </p>
              </div>
              <div className="text-xs text-zinc-400 sm:text-sm">
                Date: <span className="font-semibold text-zinc-200">{todayIso}</span>
              </div>
            </div>

            {overviewStatus === "loading" && (
              <p className="text-xs text-zinc-400 sm:text-sm">Loading today&apos;s RGR summary…</p>
            )}
            {overviewStatus === "error" && overviewError && (
              <p className="text-xs text-red-400 sm:text-sm">{overviewError}</p>
            )}

            {overviewStatus !== "loading" && overviewCards.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {overviewCards.map((card) => (
                  <article
                    key={card.et}
                    className="flex flex-col justify-between rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-xs shadow-sm sm:p-4 sm:text-sm"
                  >
                    <div className="mb-2">
                      <h3 className="line-clamp-2 text-sm font-semibold text-zinc-100 sm:text-base">
                        {card.et}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-emerald-300/90 sm:text-xs">
                        Campaign: RGR
                      </p>
                    </div>
                    <div className="mt-1 flex flex-col gap-1.5">
                      <p>
                        <span className="font-medium text-zinc-200">Mails: </span>
                        <span className="font-semibold text-zinc-100">
                          {card.totalMails.toLocaleString()}
                        </span>
                      </p>
                      <p>
                        <span className="font-medium text-zinc-200">Count: </span>
                        <span className="font-semibold text-emerald-300">
                          {card.totalCount.toLocaleString()}
                        </span>
                      </p>
                      {!card.hadData && (
                        <p className="text-[11px] text-zinc-500 sm:text-xs">
                          No RGR data for today on this ET.
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>

        <footer className="mt-6 border-t border-white/10 pt-4 text-center text-[11px] text-zinc-500 sm:text-xs">
          Made with ❤️ - Ayush Srivastava (F.Stack DEV.)
        </footer>
      </div>
    </div>
  );
}

function DownloadPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setDeferredPrompt(e as any);
      setIsSupported(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener,
      );
    };
  }, []);

  async function handleClick() {
    if (!deferredPrompt) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promptEvent = deferredPrompt as any;
    promptEvent.prompt();
    await promptEvent.userChoice;
    setDeferredPrompt(null);
  }

  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center justify-center rounded-full border border-sky-400/70 bg-sky-500/90 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-sky-400 sm:px-4 sm:py-2 sm:text-sm"
    >
      DOWNLOAD MOBILE APP
    </button>
  );
}

