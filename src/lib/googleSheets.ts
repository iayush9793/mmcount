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

export async function getMailCounts({ isoDate, etNameOrAll }: { isoDate: string; campaign: string; etNameOrAll: string; template: string }) {
  if (!SPREADSHEET_ID || !isoDate) return { totalMails: 0, totalCount: 0, calculatedVolume: 0, hadData: false, breakdown: [] };

  const tabs = await listETTabs();
  const targetTabs = etNameOrAll.toUpperCase().startsWith("ALL") 
    ? tabs 
    : tabs.filter((t) => t.toLowerCase() === etNameOrAll.trim().toLowerCase());

  const sheets = await getSheetsClient();
  const formattedDate = isoToSheetDate(isoDate);

  const breakdownMap = new Map<string, { template: string; etSource: string; count: number; multiplier: number }>();
  let grandTotalMails = 0;
  let grandTotalCalculatedVolume = 0;
  let grandTotalRawMailsTracked = 0;

  for (const tab of targetTabs) {
    try {
      const tabUpper = tab.toUpperCase().replace(/\s+/g, "");
      const rowMultiplier = (tabUpper.includes("JSG40") || tabUpper.includes("JSG38")) ? 2000 : 5000;

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${tab}'!A:ZZ`,
      });
      const values = res.data.values ?? [];
      if (values.length <= 1) continue;

      const headerRow = values[0];

      // Scan rows matching date constraints and parse values across all columns dynamically
      for (let i = 1; i < values.length; i++) {
        const row = values[i];
        const rawDate = normalizeCell(row[0]);
        const currentTemplate = normalizeCell(row[1]);

        if (rawDate !== formattedDate || !currentTemplate) continue;

        // Sum across all columns containing count numbers for that row instance
        for (let colIdx = 2; colIdx < headerRow.length; colIdx++) {
          const cellValue = normalizeCell(row[colIdx]);
          if (!cellValue) continue;

          const valNum = Number(cellValue.replace(/,/g, ""));
          const countValue = !Number.isNaN(valNum) ? valNum : 0;

          if (countValue > 0) {
            grandTotalMails += 1;
            grandTotalRawMailsTracked += countValue;
            grandTotalCalculatedVolume += (countValue * rowMultiplier);

            const groupKey = `${currentTemplate}_${tab}`;
            const existingItem = breakdownMap.get(groupKey) || { template: currentTemplate, etSource: tab, count: 0, multiplier: rowMultiplier };
            
            breakdownMap.set(groupKey, {
              template: currentTemplate,
              etSource: tab,
              count: existingItem.count + countValue,
              multiplier: rowMultiplier
            });
          }
        }
      }
    } catch (err) {
      console.error(`Error processing matrix on tab ${tab}:`, err);
    }
  }

  return {
    totalMails: grandTotalMails,
    totalCount: grandTotalRawMailsTracked,
    calculatedVolume: grandTotalCalculatedVolume, 
    hadData: grandTotalCalculatedVolume > 0,
    breakdown: Array.from(breakdownMap.values()).sort((a, b) => a.template.localeCompare(b.template)),
  };
}
