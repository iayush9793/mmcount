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







interface RevenueRecord {



  subid: string;



  revenue: number;



}







interface BeforeInstallPromptEvent extends Event {



  readonly platforms: Array<string>;



  readonly userChoice: Promise<{



    outcome: "accepted" | "dismissed";



    allowed_platforms: Array<string>;



  }>;



  prompt(): Promise<void>;



}







// GLOBAL UTILITY MAPPERS AND RESOLVERS



function rowMultiplier(tabName: string): number {

  const clean = tabName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();



  const specialTargets = [

  "JSG30MET",

    "JSG43",

    "JSG55",

    "JSG50",

    "JSG26",

    "JSG41",

    "JSG45",

    "JSG48MET"

  ];



  const hasSpecial = specialTargets.some((target) => clean.includes(target));



  return hasSpecial ? 4000 : 5000;

}







function getReportSubidAccountName(sheetTabName: string): string {



  const txt = sheetTabName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();



  if (txt.includes("JSG43")) return "JSG43MET";

if (txt.includes("JSG34")) return "JSG34";

  if (txt.includes("JSG44")) return "JSG44";



  if (txt.includes("JSG50")) return "JSG50";



  if (txt.includes("JSG38NEW") || txt === "JSG38N" || txt === "JSG38") return "JSG38N";



  if (txt.includes("JSG40")) return "JSG40";



  if (txt.includes("JSG47")) return "JSG47";



  if (txt.includes("JSG26")) return "JSG26MET";



  if (txt.includes("JSG36")) return "JSG36MET";



  if (txt.includes("JSG41")) return "JSG41MET";



  if (txt.includes("JSG45")) return "JSG45";



  if (txt.includes("JSG48MET") || txt === "JSG48") return "JSG48MET";



  if (txt.includes("JSG53")) return "JSG53MET";



  return txt;



}







function getNormalizedTemplateAlias(sheetTemplate: string): string {



  const original = sheetTemplate.trim().toUpperCase();



  if (original === "K_RGR_905_A5") return "RGR_905_A5";



  if (original === "K_RGR_905_A1") return "RGR_905_A1";



  if (original === "P_R_ADT_542_OFF_IMG") return "ADT_542_OFF_IMG";



  if (original === "P_R_AHS_403_OG2") return "AHS_403_OG2";



  if (original === "K_RGR_905_A2") return "RGR_905_A2";



  if (original === "K_RGR_905_A4") return "RGR_905_A4";



  if (original === "E_RGR_029_D") return "RGR_029_D";



  if (original === "E_RGR_028_D") return "RGR_028_D";



  if (original === "P_R_RHF_009_IMG") return "RHF_009_IMG";



  if (original === "E_R_RGR_2083_RM") return "RGR_2083_RM";



  if (original === "E_RGR_031_D") return "RGR_031_D";



  if (original === "P_R_TRU_541_OG2") return "TRU_541_OG2";



  if (original === "RGR_KARTIK0905_NV") return "RGR_KARTIK0905";



  return original;



}







function formatTabBeautifulLabel(tabName: string): string {



  const raw = tabName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();



  if (raw.includes("JSG43")) return "JSG43 (STACK 13)";

if (raw.includes("JSG34")) return "JSG34 (STACK 4)";

  if (raw.includes("JSG44")) return "JSG44 (STACK 11)";



  if (raw.includes("JSG50")) return "JSG50 (STACK 7)";



  if (raw.includes("JSG38NEW") || raw === "JSG38N" || raw === "JSG38") return "JSG38NEW (STACK 12)";



  if (raw.includes("JSG40")) return "JSG40 (STACK 12)";



  if (raw.includes("JSG47")) return "JSG47 (STACK 7)";



  if (raw.includes("JSG26")) return "JSG26 (STACK 7)";



  if (raw.includes("JSG36")) return "JSG36 (STACK 6)";



  if (raw.includes("JSG41")) return "JSG41 (STACK 1)";



  if (raw.includes("JSG45")) return "JSG45 (STACK 1)";



  if (raw.includes("JSG48")) return "JSG48MET";



  if (raw.includes("JSG53")) return "JSG53 (STACK 11)";



  return tabName;



}







export default function Home() {



  const [isAppLoading, setIsAppLoading] = useState(true);



  const [isDarkMode, setIsDarkMode] = useState(true);



  const [currentView, setCurrentView] = useState<"standard" | "analytics">("standard");







  // Core Stage 1 Inputs



  const [startDate, setStartDate] = useState("");



  const [endDate, setEndDate] = useState("");



  const [ets, setEts] = useState<string[]>([]);



  const [selectedEt, setSelectedEt] = useState("");







  // Dashboard Core States



  const [dashboardData, setDashboardData] = useState<BreakdownItem[] | null>(null);



  const [isDashboardLoading, setIsDashboardLoading] = useState(false);







  // Custom Range Query States



  const [allFetchedData, setAllFetchedData] = useState<BreakdownItem[] | null>(null);



  const [selectedCampaign, setSelectedCampaign] = useState("");



  const [selectedTemplate, setSelectedTemplate] = useState("");



  const [status, setStatus] = useState<FetchStatus>("idle");



  const [errorMessage, setErrorMessage] = useState("");







  // Detailed Analytics Specific States



  const [uploadedFilesSummary, setUploadedFilesSummary] = useState<string[]>([]);



  const [combinedCsvRecords, setCombinedRevenueRecords] = useState<RevenueRecord[]>([]);



  const [reportDays, setReportDays] = useState("1");



  const [analyticsActive, setAnalyticsActive] = useState(false);



  const [analyticsEt, setAnalyticsEt] = useState("");



  const [analyticsCampaign, setAnalyticsCampaign] = useState("");



  const [isSelectorModalOpen, setIsSelectorModalOpen] = useState(false);



  const [selectedTabFocus, setSelectedTabFocus] = useState<string>("");







  // Native PWA Prompt States



  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);



  const [showInstallBtn, setShowInstallBtn] = useState(false);







  useEffect(() => {



    const iso = new Date().toISOString().slice(0, 10);



    setStartDate(iso);



    setEndDate(iso);



    setIsDashboardLoading(true);







    window.addEventListener("beforeinstallprompt", (e) => {



      e.preventDefault();



      setDeferredPrompt(e as BeforeInstallPromptEvent);



      setShowInstallBtn(true);



    });







    window.addEventListener("appinstalled", () => {



      setDeferredPrompt(null);



      setShowInstallBtn(false);



    });



    



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



  }, []);







  const handlePwaDownloadApp = async () => {



    if (!deferredPrompt) return;



    await deferredPrompt.prompt();



    const { outcome } = await deferredPrompt.userChoice;



    if (outcome === "accepted") {



      setDeferredPrompt(null);



      setShowInstallBtn(false);



    }



  };







  const getFilterRule = (campaignName: string): FilterRule => {



    const cleanCamp = campaignName.toUpperCase().trim();



    if (cleanCamp === "RGR") return { includes: ["RGR"], excludes: [] };



    if (cleanCamp === "ARW_AD") return { includes: ["ARW"], excludes: [] };



    if (cleanCamp === "ICO") return { includes: ["ICO"], excludes: [] };



    if (cleanCamp === "AHS_AD" || cleanCamp.startsWith("AHS")) return { includes: ["AHS"], excludes: ["DB", "XCE", "GZ", "XC", "ES"] };



    if (cleanCamp === "SHW_ES" || cleanCamp.startsWith("SHW")) return { includes: ["SHW", "ES"], excludes: ["DB", "XCE", "GZ", "XC"] };



    if (cleanCamp === "XCE_AIR" || cleanCamp === "AIR") return { includes: ["AIR"], excludes: [] };



    if (cleanCamp === "FIR_XC" || cleanCamp.startsWith("FIR")) return { includes: ["FIR"], excludes: [] };



    if (cleanCamp === "HEC_AD" || cleanCamp.startsWith("HEC")) return { includes: ["HEC"], excludes: [] };



    if (cleanCamp === "INSURIFY_GZ") return { includes: ["IA"], excludes: ["IAI"] };



    if (cleanCamp === "LR_GZ" || cleanCamp.startsWith("LR")) return { includes: ["LR"], excludes: [] };



    if (cleanCamp.includes("E-VETERANS_DB") || cleanCamp.includes("VETERANS_DB")) return { includes: ["EVL"], excludes: [] };



    if (cleanCamp === "FGLO_DB" || cleanCamp.startsWith("FGLO")) return { includes: ["FGLO"], excludes: [] };



    if (cleanCamp === "ADT_AD" || cleanCamp.startsWith("ADT")) return { includes: ["ADT"], excludes: ["DB", "XCE", "GZ", "XC"] };



    if (cleanCamp.includes("RYH FLOORING") || cleanCamp.includes("RYH_FLOORING")) return { includes: ["RHF"], excludes: ["DB", "XCE", "GZ", "XC"] };



    if (cleanCamp === "JG_CMAD") return { includes: ["JG"], excludes: ["DB", "XCE", "GZ", "XC"] };



    if (cleanCamp === "SQMH_ES") return { includes: ["SQMH"], excludes: ["DB", "XCE", "GZ", "XC"] };



    if (cleanCamp === "EFA_ES") return { includes: ["EFA"], excludes: ["DB", "XCE", "GZ", "XC"] };  



    if (cleanCamp === "EAC_CMAD") return { includes: ["EAC"], excludes: ["DB", "XCE", "GZ", "XC"] };



    if (cleanCamp === "CH_XC" || cleanCamp.startsWith("CH")) return { includes: ["CH"], excludes: [] };



    if (cleanCamp === "LBH_DB" || cleanCamp.startsWith("LBH")) return { includes: ["LBH", "DB"], excludes: ["XCE", "GZ", "XC", "ES"] };

 if (cleanCamp === "ENDURANCE_XC") return { includes: ["EAC", "XC"], excludes: [ "AD"] };

     if (cleanCamp === "ENDURANCE_AD") return { includes: ["EAC", "AD"], excludes: ["XC"] };



    if (cleanCamp === "NDR_CMAD") return { includes: ["NDR", "CMAD"], excludes: ["XCE", "XC", "ES"] };



    if (cleanCamp === "NDR_GZ" || cleanCamp === "NDR") return { includes: ["NDR", "GZ"], excludes: ["XCE", "XC", "ES", "CMAD"] };



    



    if (cleanCamp === "ZBH" || cleanCamp.startsWith("ZBH")) return { includes: ["ZBH", "ES"], excludes: ["XCE", "XC", "DB"] };



    if (cleanCamp === "WS" || cleanCamp.startsWith("WS")) return { includes: ["WS", "CMAD"], excludes: ["XCE", "XC", "ES"] };



    if (cleanCamp === "QLR" || cleanCamp.startsWith("QLR")) return { includes: ["QLR", "ES"], excludes: ["XCE", "XC", "DB"] };



    if (cleanCamp === "VIVINT_AD" || cleanCamp === "VIVINT") return { includes: ["VI"], excludes: ["XCE", "XC", "ES", "GZ", "DB"] };



    if (cleanCamp === "TRUGREEN_AD") return { includes: ["TRU"], excludes: ["XCE", "XC", "ES", "GZ", "DB"] };



    if (cleanCamp.includes("IAI_GZ")) return { includes: ["IAI"], excludes: [] };



    if (cleanCamp === "RBA_XCE" || cleanCamp.startsWith("RBA")) return { includes: ["RBA", "XCE"], excludes: ["XC", "ES", "GZ", "DB"] };



    if (cleanCamp === "JG_XCE") return { includes: ["JG", "XCE"], excludes: ["XC", "ES", "GZ", "DB"] };



    if (cleanCamp === "TRUGREEN_DB") return { includes: ["TRU", "DB"], excludes: ["XC", "ES", "GZ", "XCE"] };



    if (cleanCamp === "ASSURITI_DB") return { includes: ["AAW"], excludes: [] };



    if (cleanCamp === "QUOTIFII_DB") return { includes: ["QTI"], excludes: [] };



 



    return { includes: [cleanCamp.split("_")[0]], excludes: [] };



  };







  const matchTemplate = (templateName: string, rule: FilterRule): boolean => {



    const tmplUpper = templateName.toUpperCase();



    return rule.includes.every(inc => tmplUpper.includes(inc)) && !rule.excludes.some(exc => tmplUpper.includes(exc));



  };







  const topFiveCampaignsSummary = useMemo(() => {



    if (!dashboardData) return [];



    const aggregated = new Map<string, number>();



    dashboardData.forEach((item) => {



      aggregated.set(item.campaignSrc.toUpperCase().trim(), (aggregated.get(item.campaignSrc.toUpperCase().trim()) || 0) + (item.count * item.multiplier));



    });



    return Array.from(aggregated.entries())



      .map(([name, volume]) => ({ name, volume }))



      .sort((a, b) => b.volume - a.volume)



      .slice(0, 5);



  }, [dashboardData]);







  const dashboardAccountWiseMetrics = useMemo(() => {



    if (!dashboardData) return [];



    const accountsMap = new Map<string, { totalMails: number; calculatedVolume: number }>();



    dashboardData.forEach((item) => {



      const etUpper = item.etSource.toUpperCase().trim();



      const existing = accountsMap.get(etUpper) || { totalMails: 0, calculatedVolume: 0 };



      accountsMap.set(etUpper, { totalMails: existing.totalMails + item.count, calculatedVolume: existing.calculatedVolume + (item.count * item.multiplier) });



    });



    return Array.from(accountsMap.entries()).map(([account, meta]) => ({ account, ...meta }));



  }, [dashboardData]);







  const dashboardCampaignWiseMetrics = useMemo(() => {



    if (!dashboardData) return [];



    const campaignsMap = new Map<string, { totalMails: number; calculatedVolume: number }>();



    dashboardData.forEach((item) => {



      const campUpper = item.campaignSrc.toUpperCase().trim();



      const existing = campaignsMap.get(campUpper) || { totalMails: 0, calculatedVolume: 0 };



      campaignsMap.set(campUpper, { totalMails: existing.totalMails + item.count, calculatedVolume: existing.calculatedVolume + (item.count * item.multiplier) });



    });



    return Array.from(campaignsMap.entries()).map(([campaign, meta]) => ({ campaign, ...meta }));



  }, [dashboardData]);







  async function handleProcessDataMatrix() {



    if (!startDate || !endDate || !selectedEt) return;



    setErrorMessage("");



    



    if (startDate !== endDate && new Date(endDate) < new Date(startDate)) { 



      setErrorMessage("End Date cannot be earlier than Start Date."); 



      return; 



    }







    setAllFetchedData(null);



    setSelectedCampaign("");



    setSelectedTemplate("");



    setStatus("loading");







    setTimeout(async () => {



      try {



        const lookupEt = selectedEt.toUpperCase().startsWith("ALL") ? "ALL" : selectedEt;



        const res = await fetch(`/api/mailCounts?startDate=${startDate}&endDate=${endDate}&et=${encodeURIComponent(lookupEt)}`);



        const data = await res.json();



        setAllFetchedData(data.breakdown ?? []);



        setStatus("success");



      } catch {



        setStatus("error");



      }



    }, 60);



  }







  const dynamicCampaignOptions = useMemo(() => {



    if (!allFetchedData) return [];



    const uniqueCamps = new Set<string>();



    allFetchedData.forEach((item) => { if (item.campaignSrc) uniqueCamps.add(item.campaignSrc.toUpperCase().trim()); });



    return Array.from(uniqueCamps).sort();



  }, [allFetchedData]);







  const dynamicTemplateOptions = useMemo(() => {



    if (!allFetchedData || !selectedCampaign) return [];



    const rule = getFilterRule(selectedCampaign);



    const options = allFetchedData.filter((item) => item.campaignSrc.toUpperCase().trim() === selectedCampaign.toUpperCase().trim() && matchTemplate(item.template, rule)).map((item) => item.template);



    return Array.from(new Set(options)).sort();



  }, [allFetchedData, selectedCampaign]);







  const currentFilteredBaseRows = useMemo(() => {



    if (!allFetchedData || !selectedCampaign || !selectedTemplate) return [];



    const rule = getFilterRule(selectedCampaign);



    let rows = allFetchedData.filter((item) => item.campaignSrc.toUpperCase().trim() === selectedCampaign.toUpperCase().trim() && matchTemplate(item.template, rule));



    if (selectedTemplate !== "ALL") rows = rows.filter((item) => item.template.toLowerCase() === selectedTemplate.toLowerCase());



    return rows;



  }, [allFetchedData, selectedCampaign, selectedTemplate]);





const globalCampaignCalculatedTotals = useMemo(() => {

    if (currentFilteredBaseRows.length === 0) return null;

    const uniqueTemplatesCount = new Set(currentFilteredBaseRows.map((r) => r.template.toUpperCase().trim())).size;

    return {

      totalMails: currentFilteredBaseRows.reduce((sum, item) => sum + item.count, 0),

      calculatedVolume: currentFilteredBaseRows.reduce((sum, item) => sum + (item.count * item.multiplier), 0),

      uniqueTemplates: uniqueTemplatesCount,

    };

  }, [currentFilteredBaseRows]);







  const processedAccountWiseCards = useMemo(() => {



    const cardsMap = new Map<string, { totalMails: number; totalVolume: number; templates: Array<{ name: string; count: number; vol: number }> }>();



    currentFilteredBaseRows.forEach((item) => {



      const etKey = item.etSource.toUpperCase().trim();



      const existing = cardsMap.get(etKey) || { totalMails: 0, totalVolume: 0, templates: [] };



      const rowVolume = item.count * item.multiplier;



      const targetTmpl = existing.templates.find(t => t.name === item.template);



      if (targetTmpl) { targetTmpl.count += item.count; targetTmpl.vol += rowVolume; }



      else { existing.templates.push({ name: item.template, count: item.count, vol: rowVolume }); }



      cardsMap.set(etKey, { totalMails: existing.totalMails + item.count, totalVolume: existing.totalVolume + rowVolume, templates: existing.templates });



    });



    return Array.from(cardsMap.entries()).map(([account, meta]) => ({ account, ...meta }));



  }, [currentFilteredBaseRows]);







  const analyticsCampaignOptions = useMemo(() => {



    if (!allFetchedData) return [];



    const unique = new Set<string>();



    allFetchedData.forEach(item => { if (item.campaignSrc) unique.add(item.campaignSrc.toUpperCase().trim()); });



    return Array.from(unique).sort();



  }, [allFetchedData]);







  const revenueCalculatedCards = useMemo(() => {



    if (!allFetchedData || !analyticsActive) return [];







    let filteredBase = allFetchedData;



    if (analyticsEt && !analyticsEt.toUpperCase().startsWith("ALL")) {



      filteredBase = filteredBase.filter(item => item.etSource.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() === analyticsEt.replace(/[^a-zA-Z0-9]/g, "").toUpperCase());



    }



    if (analyticsCampaign && !analyticsCampaign.toUpperCase().startsWith("ALL")) {



      filteredBase = filteredBase.filter(item => item.campaignSrc.toUpperCase().trim() === analyticsCampaign.toUpperCase().trim());



    }







    const accountGroups = new Map<string, BreakdownItem[]>();



    filteredBase.forEach(item => {



      const key = item.etSource.toUpperCase().trim();



      const existing = accountGroups.get(key) || [];



      existing.push(item);



      accountGroups.set(key, existing);



    });







    return Array.from(accountGroups.entries()).map(([accountName, rows]) => {



      const templatesList = rows.map(row => {



        const matchedRevenueHits = combinedCsvRecords.filter(rec => {



          const subidStr = rec.subid.trim();



          const lastUnderscoreIdx = subidStr.lastIndexOf("_");



          if (lastUnderscoreIdx === -1) return false;







          const parsedTemplateName = subidStr.substring(0, lastUnderscoreIdx).trim().toUpperCase();



          const parsedAccountName = subidStr.substring(lastUnderscoreIdx + 1).trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();







          const cleanSheetTemplate = getNormalizedTemplateAlias(row.template);



          const cleanSheetAccount = getReportSubidAccountName(accountName).toUpperCase();







          return parsedTemplateName === cleanSheetTemplate && parsedAccountName === cleanSheetAccount;



        });







        const revenueSum = matchedRevenueHits.reduce((sum, r) => sum + r.revenue, 0);



        const conversionCount = matchedRevenueHits.length;



        const totalSendingVolume = row.count * rowMultiplier(accountName);



        const countNeededPerConversion = conversionCount > 0 ? Math.round(totalSendingVolume / conversionCount) : null;







        return {



          templateName: row.template,



          campaignName: row.campaignSrc,



          mailsUsed: row.count,



          sendingVolume: totalSendingVolume,



          revenue: revenueSum,



          conversions: conversionCount,



          efficiency: countNeededPerConversion



        };



      });







      const cardTotalRevenue = templatesList.reduce((sum, t) => sum + t.revenue, 0);



      return { accountName, templates: templatesList, cardTotalRevenue };



    });



  }, [allFetchedData, analyticsActive, analyticsEt, analyticsCampaign, combinedCsvRecords]);







  const distinctRevenueAccountTabs = useMemo(() => {



    return revenueCalculatedCards.map(c => c.accountName);



  }, [revenueCalculatedCards]);







  const targetedActiveFocusedCard = useMemo(() => {



    if (!selectedTabFocus || revenueCalculatedCards.length === 0) return revenueCalculatedCards[0] || null;



    return revenueCalculatedCards.find(c => c.accountName.toUpperCase() === selectedTabFocus.toUpperCase()) || revenueCalculatedCards[0] || null;



  }, [selectedTabFocus, revenueCalculatedCards]);







  const handleMultipleCsvFilesLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {



    const files = e.target.files;



    if (!files || files.length === 0) return;







    const namesArray: string[] = [];



    let combinedRecords: RevenueRecord[] = [];







    for (let i = 0; i < files.length; i++) {



      const file = files[i];



      namesArray.push(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);







      const text = await new Promise<string>((resolve) => {



        const reader = new FileReader();



        reader.onload = (event) => resolve(event.target?.result as string ?? "");



        reader.readAsText(file);



      });







      const lines = text.split(/\r?\n/);



      if (lines.length <= 1) continue;







      const headers = lines[0].split(",").map(h => h.trim().toUpperCase());



      const subidIdx = headers.indexOf("SUBID");



      let revIdx = headers.indexOf("REV");



      if (revIdx === -1) revIdx = headers.indexOf("REVENUE");



      if (revIdx === -1) revIdx = headers.indexOf("AMOUNT");







      for (let j = 1; j < lines.length; j++) {



        if (!lines[j].trim()) continue;



        const cells = lines[j].split(",");



        const subidVal = cells[subidIdx]?.trim() ?? "";



        const revVal = Number(cells[revIdx]?.trim() ?? 0);



        if (subidVal) {



          combinedRecords.push({ subid: subidVal, revenue: Number.isNaN(revVal) ? 0 : revVal });



        }



      }



    }







    setUploadedFilesSummary(namesArray);



    setCombinedRevenueRecords(combinedRecords);



  };







  const handleCompileAnalytics = () => {



    if (!startDate || !endDate || combinedCsvRecords.length === 0) return;



    



    setAllFetchedData(null);



    setAnalyticsActive(false);



    setStatus("loading");







    setTimeout(async () => {



      try {



        const res = await fetch(`/api/mailCounts?startDate=${startDate}&endDate=${endDate}&et=ALL`);



        const data = await res.json();



        setAllFetchedData(data.breakdown ?? []);



        setIsSelectorModalOpen(true);



        setStatus("success");



      } catch { 



        setStatus("error"); 



      }



    }, 60);



  };







  const handleApplyAnalyticsFilters = () => {



    setIsSelectorModalOpen(false);



    setAnalyticsActive(true);



  };







  return (



    <div className={`min-h-screen transition-colors duration-500 p-4 sm:p-8 flex flex-col justify-between ${isDarkMode ? "bg-[#090d16] text-zinc-100 font-sans" : "bg-slate-50 text-slate-900 font-sans"}`}>



      



      {/* 80% SCREEN SIZE CONTAINER */}



      <div className="w-full xl:max-w-[80vw] xl:mx-auto flex flex-col gap-6 flex-1">



        



        {/* GLOBAL PERSISTENT SPINNING PRELOADER OVERLAY */}



        {(isAppLoading || status === "loading") && (



          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">



            <div className="flex flex-col items-center gap-5 bg-slate-900 border border-white/5 p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-4 text-center">



              <div className="relative h-12 w-12">



                <div className="absolute inset-0 rounded-full border-4 border-zinc-800" />



                <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 border-r-emerald-500 animate-spin" />



              </div>



              <h3 className="text-base font-black text-white tracking-wide uppercase">Compiling System Metrics</h3>



              <p className="text-xs text-zinc-400">Syncing and parsing live ledger fields...</p>



            </div>



          </div>



        )}







        {/* STEP 2: DYNAMIC FILTER SELECTOR POPUP MODAL CONTROL UTILITY */}



        {isSelectorModalOpen && allFetchedData && (



          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-fadeIn">



            <div className="w-full max-w-md rounded-2xl border shadow-2xl p-6 flex flex-col bg-[#111726] border-white/10 text-white gap-4">



              <div>



                <h3 className="text-base font-black uppercase tracking-wider text-purple-400">🎯 Filter Target Parameters</h3>



                <p className="text-xs text-zinc-400 mt-0.5">Isolate report matrices frames to narrow audit views</p>



              </div>







              <div className="flex flex-col gap-3">



                <div className="flex flex-col gap-1">



                  <label className="text-xs font-semibold text-zinc-400">Filter Account (ET)</label>



                  <select value={analyticsEt} onChange={e => setAnalyticsEt(e.target.value)} className="h-11 rounded-lg px-3 text-sm outline-none border bg-slate-950 border-zinc-800 text-white focus:border-purple-500">



                    <option value="ALL">ALL ACCOUNTS</option>



                    {ets.map(e => <option key={e} value={e}>{e}</option>)}



                  </select>



                </div>



                <div className="flex flex-col gap-1">



                  <label className="text-xs font-semibold text-zinc-400">Filter Campaign Segment</label>



                  <select value={analyticsCampaign} onChange={e => setAnalyticsCampaign(e.target.value)} className="h-11 rounded-lg px-3 text-sm outline-none border bg-slate-950 border-zinc-800 text-white focus:border-purple-500">



                    <option value="ALL">ALL CAMPAIGNS</option>



                    {analyticsCampaignOptions.map(c => <option key={c} value={c}>{c}</option>)}



                  </select>



                </div>



              </div>







              <div className="flex gap-2 justify-end mt-2">



                <button onClick={() => setIsSelectorModalOpen(false)} className="h-10 px-4 rounded-lg bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition">



                  Cancel



                </button>



                <button onClick={handleApplyAnalyticsFilters} className="h-10 px-5 rounded-lg bg-purple-600 text-xs font-bold text-white hover:bg-purple-500 transition shadow-lg">



                  Show Results



                </button>



              </div>



            </div>



          </div>



        )}







        <header className={`border-b pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isDarkMode ? "border-white/10" : "border-slate-200"}`}>



          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">



            <div className="relative h-20 w-48 shrink-0">



              <Image src="/logo.png" alt="Logo" fill priority className="object-contain object-left" />



            </div>



            <div className="flex rounded-lg p-1 bg-slate-900/60 border border-white/5 shadow-inner">



              <button onClick={() => { setCurrentView("standard"); setAllFetchedData(null); setAnalyticsActive(false); }} className={`px-5 py-2 text-xs font-black rounded-md transition ${currentView === "standard" ? "bg-emerald-500 text-white shadow-lg" : "text-zinc-400 hover:text-zinc-200"}`}>



                Standard Volume Tracking



              </button>



              <button onClick={() => { setCurrentView("analytics"); setAllFetchedData(null); }} className={`px-5 py-2 text-xs font-black rounded-md transition ${currentView === "analytics" ? "bg-emerald-500 text-white shadow-lg" : "text-zinc-400 hover:text-zinc-200"}`}>



                Detailed Conversion Analytics



              </button>



            </div>



          </div>



          



          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">



            {showInstallBtn && (



              <button onClick={handlePwaDownloadApp} className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black shadow-lg shadow-purple-500/10 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 animate-bounce">



                <span>📥</span> Download App



              </button>



            )}



            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2.5 rounded-full border text-xs font-bold transition ${isDarkMode ? "border-zinc-800 text-white hover:bg-zinc-900" : "border-slate-300 text-slate-800 hover:bg-slate-100"}`}>



              {isDarkMode ? "🌙 Dark Mode" : "☀️ Light Mode"}



            </button>



          </div>



        </header>







        {currentView === "standard" && (



          <>



            {!allFetchedData && (



              <div className="flex flex-col gap-6 animate-fadeIn">



                <section className={`rounded-xl p-6 border shadow-xl ${isDarkMode ? "bg-[#111726] border-white/5" : "bg-white border-slate-200"}`}>



                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-4">🔥 Top Active Campaigns Matrix Split</h3>



                  {isDashboardLoading ? (



                    <div className="h-12 flex items-center justify-center text-xs text-zinc-400 font-medium">Syncing live dashboard summaries...</div>



                  ) : topFiveCampaignsSummary.length === 0 ? (



                    <div className="h-12 flex items-center justify-center text-xs text-zinc-400">No active records logged today.</div>



                  ) : (



                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-5">



                      {topFiveCampaignsSummary.map((item, idx) => (



                        <div key={item.name} className={`p-4 rounded-xl border flex flex-col justify-between ${isDarkMode ? "bg-slate-950/40 border-zinc-800 text-white" : "bg-slate-50 border-slate-200"}`}>



                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Rank #{idx + 1}</span>



                          <span className="text-sm font-black truncate mt-1 text-zinc-200" title={item.name}>{item.name}</span>



                          <span className="text-lg font-black text-emerald-500 mt-2">{item.volume.toLocaleString()}</span>



                        </div>



                      ))}



                    </div>



                  )}



                </section>







                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">



                  <section className={`rounded-xl p-6 border shadow-xl ${isDarkMode ? "bg-[#111726] border-white/5" : "bg-white border-slate-200"}`}>



                    <h3 className="text-xs font-black uppercase tracking-widest text-sky-400 mb-4">📋 Origin Account Wise Sending Splits</h3>



                    <div className={`max-h-[350px] overflow-y-auto divide-y font-mono text-sm pr-2 ${isDarkMode ? "divide-zinc-800/40 text-zinc-300" : "divide-slate-200"}`}>



                      {dashboardAccountWiseMetrics.map((item) => (



                        <div key={item.account} className="py-3 flex justify-between items-center gap-2">



                          <span className="font-sans font-bold text-zinc-300">{item.account}</span>



                          <span className="font-black text-sky-400 shrink-0 text-base">{item.calculatedVolume.toLocaleString()} <span className="text-xs text-zinc-500 font-normal">({item.totalMails} items)</span></span>



                        </div>



                      ))}



                    </div>



                  </section>







                  <section className={`rounded-xl p-6 border shadow-xl ${isDarkMode ? "bg-[#111726] border-white/5" : "bg-white border-slate-200"}`}>



                    <h3 className="text-xs font-black uppercase tracking-wider text-purple-400 mb-4">📊 Broad Campaign Aggregate Metrics</h3>



                    <div className={`max-h-[350px] overflow-y-auto divide-y font-mono text-sm pr-2 ${isDarkMode ? "divide-zinc-800/40 text-zinc-300" : "divide-slate-200"}`}>



                      {dashboardCampaignWiseMetrics.map((item) => (



                        <div key={item.campaign} className="py-3 flex justify-between items-center gap-2">



                          <span className="font-sans font-bold text-zinc-300">{item.campaign}</span>



                          <span className="font-black text-purple-400 shrink-0 text-base">{item.calculatedVolume.toLocaleString()} <span className="text-[10px] text-zinc-500 font-normal">({item.totalMails} items)</span></span>



                        </div>



                      ))}



                    </div>



                  </section>



                </div>



              </div>



            )}







            <section className={`rounded-xl p-6 flex flex-col gap-4 border shadow-xl ${isDarkMode ? "bg-[#111726] border-white/5" : "bg-white border-slate-200"}`}>



              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 items-end">



                <div className="flex flex-col gap-1.5">



                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Start Date</label>



                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`h-12 rounded-lg px-3 text-sm outline-none border w-full ${isDarkMode ? "bg-slate-950 border-zinc-800 text-white focus:border-emerald-500" : "bg-white border-slate-300"}`} />



                </div>



                <div className="flex flex-col gap-1.5">



                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">End Date</label>



                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`h-12 rounded-lg px-3 text-sm outline-none border w-full ${isDarkMode ? "bg-slate-950 border-zinc-800 text-white focus:border-emerald-500" : "bg-white border-slate-300"}`} />



                </div>



                <div className="flex flex-col gap-1.5">



                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Origin Account (ET)</label>



                  <select value={selectedEt} onChange={(e) => setSelectedEt(e.target.value)} className={`h-12 rounded-lg px-3 text-sm outline-none border w-full ${isDarkMode ? "bg-slate-950 border-zinc-800 text-white focus:border-emerald-500" : "bg-white border-slate-300"}`}>



                    <option value="">Select ET Account</option>



                    <option value="ALL">ALL ET'S (Combine All Sheets)</option>



                    {ets.map((e) => <option key={e} value={e}>{e}</option>)}



                  </select>



                </div>



              </div>



              {errorMessage && <p className="text-xs font-semibold text-rose-500 bg-rose-500/5 p-3 rounded-lg border border-rose-500/10">⚠️ {errorMessage}</p>}



              <button onClick={handleProcessDataMatrix} className="w-full h-12 rounded-lg bg-emerald-500 hover:bg-emerald-400 font-bold text-xs uppercase text-white tracking-widest cursor-pointer transition active:scale-95 duration-150 shadow-lg">



                Process Data Matrix



              </button>



            </section>







            {allFetchedData && (



              <div className="flex flex-col gap-6 animate-fadeIn">



                <section className={`rounded-xl p-6 grid gap-4 sm:grid-cols-2 border shadow-xl ${isDarkMode ? "bg-[#111726] border-white/5" : "bg-white border-slate-200"}`}>



                  <div className="flex flex-col gap-1.5">



                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Select Campaign Group</label>



                    <select value={selectedCampaign} onChange={(e) => { setSelectedCampaign(e.target.value); setSelectedTemplate(""); }} className={`h-12 rounded-lg px-3 text-sm outline-none border w-full ${isDarkMode ? "bg-slate-950 border-zinc-800 text-white" : "bg-white border-slate-300"}`}>



                      <option value="">Select Campaign</option>



                      {dynamicCampaignOptions.map(c => <option key={c} value={c}>{c}</option>)}



                    </select>



                  </div>



                  <div className="flex flex-col gap-1.5">



                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Select Target Template</label>



                    <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} disabled={!selectedCampaign} className={`h-12 rounded-lg px-3 text-sm outline-none border w-full ${isDarkMode ? "bg-slate-950 border-zinc-800 text-white" : "bg-white border-slate-300"}`}>



                      <option value="">{selectedCampaign ? "Select Template" : "Choose Campaign first"}</option>



                      {dynamicTemplateOptions.length > 0 && <option value="ALL">ALL MATCHED TEMPLATES</option>}



                      {dynamicTemplateOptions.map(t => <option key={t} value={t}>{t}</option>)}



                    </select>



                  </div>



                </section>







           {selectedCampaign && selectedTemplate && globalCampaignCalculatedTotals && (

                  <section className={`rounded-xl p-6 border shadow-xl grid gap-4 grid-cols-1 sm:grid-cols-4 ${isDarkMode ? "bg-[#111726] border-emerald-500/20 text-white" : "bg-white border-slate-200"}`}>

                    <div>

                      <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Campaign Focus</span>

                      <p className="text-xl font-black mt-1 text-zinc-100 truncate">{selectedCampaign}</p>

                    </div>

                    <div>

                      <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Templates Count</span>

                      <p className="text-3xl font-black text-purple-400 mt-1">{globalCampaignCalculatedTotals.uniqueTemplates.toLocaleString()}</p>

                    </div>

                    <div>

                      <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Mails Count</span>

                      <p className="text-3xl font-black text-sky-400 mt-1">{globalCampaignCalculatedTotals.totalMails.toLocaleString()}</p>

                    </div>

                    <div>

                      <span className="text-xs uppercase font-bold text-emerald-500 tracking-wider">Aggregated Volume</span>

                      <p className="text-3xl font-black text-emerald-500 mt-1">{globalCampaignCalculatedTotals.calculatedVolume.toLocaleString()}</p>

                    </div>

                  </section>

                )}







                {selectedCampaign && selectedTemplate && (



                  <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">



                    {processedAccountWiseCards.map((card) => (



                      <div key={card.account} className={`rounded-xl border shadow-lg flex flex-col justify-between overflow-hidden ${isDarkMode ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>



                        <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? "bg-slate-950/40 border-zinc-800 text-white" : "bg-slate-100 border-slate-200 text-slate-900"}`}>



                          <span className="px-3 py-1 rounded-md text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">{card.account}</span>



                          <span className="font-mono font-black text-sky-400 text-sm">{card.totalVolume.toLocaleString()}</span>



                        </div>



                        <div className={`p-4 flex-1 overflow-y-auto max-h-[200px] font-mono text-sm gap-2.5 flex flex-col ${isDarkMode ? "text-zinc-300" : "text-slate-800"}`}>



                          {card.templates.map((t, idx) => (



                            <div key={idx} className="flex justify-between items-start gap-3 border-b border-dashed border-zinc-800/60 pb-1.5 last:border-0">



                              <span className="font-sans font-bold truncate break-all text-zinc-400">{t.name}</span>



                              <span className="font-black text-zinc-200 shrink-0">{t.count}</span>



                            </div>



                          ))}



                        </div>



                        <div className={`p-3 border-t text-[10px] uppercase font-bold text-zinc-500 flex justify-between ${isDarkMode ? "bg-slate-950/10 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>



                          <span>Card Total Mails</span>



                          <span className={`font-black ${isDarkMode ? "text-zinc-300" : "text-slate-900"}`}>{card.totalMails} Mails</span>



                        </div>



                      </div>



                    ))}



                  </div>



                )}



              </div>



            )}



          </>



        )}







        {currentView === "analytics" && (



          <div className="flex flex-col gap-6 animate-fadeIn">



            



            <section className={`rounded-xl p-4 sm:p-6 border shadow-xl flex flex-col gap-4 ${isDarkMode ? "bg-[#111726] border-white/5" : "bg-white border-slate-200"}`}>



              <div className="flex justify-between items-center">



                <h3 className="text-xs font-black uppercase tracking-widest text-purple-400">📈 Step 1: Upload Conversion Statement & Specify Bounds</h3>



                



                {analyticsActive && (



                  <button onClick={() => setIsSelectorModalOpen(true)} className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black font-sans text-xs transition uppercase tracking-wider shadow-lg active:scale-95 duration-150">



                    🔄 Change Filters (AGAIN)



                  </button>



                )}



              </div>



              



              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 items-end">



                <div className="flex flex-col gap-1.5">



                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Start Date</label>



                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`h-12 rounded-lg px-3 text-sm outline-none border w-full ${isDarkMode ? "bg-slate-950 border-zinc-800 text-white focus:border-purple-500" : "bg-white border-slate-300"}`} />



                </div>



                <div className="flex flex-col gap-1.5">



                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">End Date</label>



                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`h-12 rounded-lg px-3 text-sm outline-none border w-full ${isDarkMode ? "bg-slate-950 border-zinc-800 text-white focus:border-purple-500" : "bg-white border-slate-300"}`} />



                </div>



                <div className="flex flex-col gap-1.5">



                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Report Days Duration</label>



                  <input type="number" min="1" value={reportDays} onChange={(e) => setReportDays(e.target.value)} className={`h-12 rounded-lg px-3 text-sm outline-none border w-full ${isDarkMode ? "bg-slate-950 border-zinc-800 text-white focus:border-purple-500" : "bg-white border-slate-300"}`} />



                </div>



              </div>







              <div className="flex flex-col gap-1.5 mt-2">



                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Select Revenue Ledgers Upload (Multiple Allowed .csv)</label>



                <input type="file" accept=".csv" multiple onChange={handleMultipleCsvFilesLoad} className="text-xs text-zinc-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-zinc-800 file:text-zinc-200 file:cursor-pointer hover:file:bg-zinc-700" />



              </div>







              {uploadedFilesSummary.length > 0 && (



                <div className={`p-4 rounded-xl border text-sm font-mono flex flex-col gap-1.5 ${isDarkMode ? "bg-slate-950 border-zinc-800" : "bg-slate-100 border-slate-200"}`}>



                  <span className="text-xs font-black text-zinc-500 uppercase tracking-wider font-sans">Stacked Source Files Linked ({uploadedFilesSummary.length})</span>



                  {uploadedFilesSummary.map((fName, idx) => (



                    <span key={idx} className={isDarkMode ? "text-zinc-400" : "text-slate-600"}>📄 {fName}</span>



                  ))}



                  <span className="text-emerald-400 font-black mt-1 font-sans text-base">✓ Combined {combinedCsvRecords.length.toLocaleString()} total raw entries.</span>



                </div>



              )}







              <button 



                onClick={handleCompileAnalytics}



                disabled={!startDate || !endDate || combinedCsvRecords.length === 0}



                className="w-full h-12 rounded-lg bg-purple-600 hover:bg-purple-500 font-bold text-xs uppercase text-white tracking-widest cursor-pointer disabled:opacity-40 transition active:scale-95 shadow-xl mt-2"



              >



                Compile Revenue Analytics



              </button>



            </section>







            {analyticsActive && allFetchedData && revenueCalculatedCards.length > 0 && (



              <div className="flex flex-col lg:flex-row gap-6 items-stretch animate-fadeIn w-full">



                



                {/* INTERACTIVE LEFT-SIDE ACCOUNT TOGGLE NAVIGATOR CAPSULES */}



                <div className={`lg:w-1/3 shrink-0 rounded-2xl p-4 flex flex-row lg:flex-col gap-3 overflow-auto shadow-2xl ${isDarkMode ? "bg-[#111726]/40 border border-white/5" : "bg-white border-slate-200"}`}>



                  <div className="hidden lg:block border-b border-zinc-800/60 pb-2 mb-1">



                    <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Workspace Ledger</span>



                    <h4 className="text-xs font-black text-purple-400 uppercase mt-0.5">Select Account Tab</h4>



                  </div>



                  {distinctRevenueAccountTabs.map((tabName) => {



                    const isActive = (selectedTabFocus || distinctRevenueAccountTabs[0])?.toUpperCase() === tabName.toUpperCase();



                    const cardData = revenueCalculatedCards.find(c => c.accountName === tabName);



                    return (



                      <button 



                        key={tabName}



                        onClick={() => setSelectedTabFocus(tabName)}



                        className={`px-4 py-3 rounded-xl text-sm font-bold tracking-wide text-left transition-all duration-300 transform ease-in-out shrink-0 whitespace-nowrap lg:whitespace-normal flex justify-between items-center ${



                          isActive 



                            ? "bg-purple-600 text-white shadow-purple-500/20 font-black" 



                            : isDarkMode ? "bg-[#161f33] text-zinc-300 border border-zinc-800/60 hover:text-zinc-100 hover:bg-[#1c2942]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"



                        }`}



                      >



                        <div className="flex items-center gap-2.5">



                          <span className="text-base">📁</span>



                          <span className="truncate max-w-[160px] lg:max-w-none">{formatTabBeautifulLabel(tabName)}</span>



                        </div>



                        <span className={`text-xs font-mono font-black ml-3 px-2.5 py-1 rounded-lg transition-colors ${isActive ? "bg-white/20 text-white" : "bg-[#090d16] text-purple-400 border border-purple-500/10"}`}>



                          ${cardData?.cardTotalRevenue.toLocaleString() ?? "0"}



                        </span>



                      </button>



                    );



                  })}



                </div>







                {/* THE RIGHT-SIDE FULL CANVASS DISPLAY PROJECTS CHOSEN TAB ITEMS COVERS ENTIRE WIDTH */}



                <div className="flex-1 min-w-0">



                  {targetedActiveFocusedCard && (



                    <div className={`rounded-2xl border shadow-2xl flex flex-col justify-between overflow-hidden h-full w-full ${isDarkMode ? "bg-[#111726] border-white/5" : "bg-white border-slate-200"}`}>



                      



                      <div className={`p-5 border-b flex justify-between items-center ${isDarkMode ? "bg-slate-950/60 border-zinc-800 text-white" : "bg-slate-100 border-slate-200 text-slate-900"}`}>



                        <div className="flex items-center gap-3">



                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />



                          <h2 className="text-xl font-black text-emerald-400 tracking-wide uppercase">{getReportSubidAccountName(targetedActiveFocusedCard.accountName)} Workspace</h2>



                        </div>



                        <div className="text-right">



                          <span className="text-[10px] text-zinc-500 font-black uppercase tracking-wider block">Card Total Revenue</span>



                          <span className="text-2xl font-black text-emerald-400">${targetedActiveFocusedCard.cardTotalRevenue.toLocaleString()}</span>



                        </div>



                      </div>







                      <div className={`p-5 flex-1 flex flex-col overflow-y-auto max-h-[600px] divide-y ${isDarkMode ? "divide-zinc-800/40" : "divide-slate-200"}`}>



                        {targetedActiveFocusedCard.templates.map((tmpl, tIdx) => (



                          <div key={tIdx} className="py-4 first:pt-0 last:pb-0 flex flex-col gap-2.5 font-sans">



                            



                            <div className="flex justify-between items-center gap-4">



                              <h3 className={`text-base font-bold break-all tracking-tight ${isDarkMode ? "text-zinc-100" : "text-slate-900"}`}>{tmpl.templateName}</h3>



                              <span className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase shrink-0 tracking-wider ${tmpl.conversions > 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>



                                {tmpl.conversions > 0 ? `🏆 ${tmpl.conversions} Conv` : "No Revenue"}



                              </span>



                            </div>



                            



                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2.5 text-xs">



                              <div>



                                <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Mails Used</span>



                                <span className={`text-base font-black ${isDarkMode ? "text-zinc-200" : "text-slate-800"}`}>{tmpl.mailsUsed.toLocaleString()}</span>



                              </div>



                              <div>



                                <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Sending Volume</span>



                                <span className="text-base font-black text-sky-400">{tmpl.sendingVolume.toLocaleString()}</span>



                              </div>



                              <div>



                                <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Revenue</span>



                                <span className="text-base font-black text-emerald-400">${tmpl.revenue.toLocaleString()}</span>



                              </div>



                              <div>



                                <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Count / Conversion</span>



                                <span className={`text-base font-black ${tmpl.efficiency ? "text-purple-400" : "text-rose-500"}`}>



                                  {tmpl.efficiency ? tmpl.efficiency.toLocaleString() : "N/A"}



                                </span>



                              </div>



                            </div>







                          </div>



                        ))}



                      </div>







                    </div>



                  )}



                </div>







              </div>



            )}



            



            {analyticsActive && allFetchedData && revenueCalculatedCards.length === 0 && (



              <div className="p-12 border-2 border-dashed border-zinc-800 rounded-2xl text-center text-zinc-500 text-sm font-bold bg-[#111726]/40">



                No data parameters matched this criteria combination grid. Try running compiling parameters again.



              </div>



            )}



          </div>



        )}







      </div>



    </div>



  );



}
