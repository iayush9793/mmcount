import { google } from "googleapis";

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const RAW_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

function getPrivateKey(): string {
  return RAW_PRIVATE_KEY?.replace(/\\n/g, "\n") ?? "";
}

async function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: getPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

export async function listETTabs(): Promise<string[]> {
  if (!SPREADSHEET_ID) return [];
  try {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    return res.data.sheets?.map((s) => s.properties?.title).filter((t): t is string => Boolean(t)) ?? [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

function isoToSheetDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}-${month}-${year}`;
}

function normalizeCell(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function getDatesInRange(startDateIso: string, endDateIso: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDateIso);
  const end = new Date(endDateIso);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(isoToSheetDate(d.toISOString().slice(0, 10)));
  }
  return dates;
}

export async function getMailCounts(options: { startDate: string; endDate: string; etNameOrAll: string }) {
  const { startDate, endDate, etNameOrAll } = options;
  if (!SPREADSHEET_ID || !startDate || !endDate) {
    return { totalMails: 0, totalCount: 0, calculatedVolume: 0, hadData: false, breakdown: [] };
  }

  const tabs = await listETTabs();
  const targetTabs = etNameOrAll.toUpperCase().startsWith("ALL") 
    ? tabs 
    : tabs.filter((t) => t.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === etNameOrAll.replace(/[^a-zA-Z0-9]/g, "").toLowerCase());

  const sheets = await getSheetsClient();
  const targetedSheetDates = getDatesInRange(startDate, endDate);
  const breakdownMap = new Map<string, { template: string; campaignSrc: string; etSource: string; count: number; multiplier: number }>();

  let grandTotalMails = 0;
  let grandTotalCalculatedVolume = 0;
  let grandTotalRawMailsTracked = 0;

  for (const tab of targetTabs) {
    try {
      const cleanedTabName = tab.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const rowMultiplier = (cleanedTabName.includes("JSG40") || cleanedTabName.includes("JSG38")) ? 2000 : 5000;

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${tab}'!A:ZZ`,
      });
      const values = res.data.values ?? [];
      if (values.length <= 1) continue;

      const headerRow = values[0];

      for (let i = 1; i < values.length; i++) {
        const row = values[i];
        const rawDate = normalizeCell(row[0]);
        const currentTemplate = normalizeCell(row[1]);

        if (!targetedSheetDates.includes(rawDate) || !currentTemplate) continue;

        for (let colIdx = 2; colIdx < headerRow.length; colIdx++) {
          const campaignHeader = normalizeCell(headerRow[colIdx]);
          if (!campaignHeader) continue;

          const cellValue = normalizeCell(row[colIdx]);
          if (!cellValue) continue;

          const valNum = Number(cellValue.replace(/,/g, ""));
          const countValue = !Number.isNaN(valNum) ? valNum : 0;

          if (countValue > 0) {
            grandTotalMails += 1;
            grandTotalRawMailsTracked += countValue;
            grandTotalCalculatedVolume += (countValue * rowMultiplier);

            const groupKey = `${currentTemplate}_${campaignHeader}_${tab}`;
            const existingItem = breakdownMap.get(groupKey) || { template: currentTemplate, campaignSrc: campaignHeader, etSource: tab, count: 0, multiplier: rowMultiplier };
            
            breakdownMap.set(groupKey, {
              template: currentTemplate,
              campaignSrc: campaignHeader,
              etSource: tab,
              count: existingItem.count + countValue,
              multiplier: rowMultiplier
            });
          }
        }
      }
    } catch (err) {
      console.error(`Error processing metrics on tab ${tab}:`, err);
    }
  }

  return {
    totalMails: grandTotalMails,
    totalCount: grandTotalRawMailsTracked,
    calculatedVolume: grandTotalCalculatedVolume, 
    hadData: grandTotalCalculatedVolume > 0,
    breakdown: Array.from(breakdownMap.values()),
  };
}
