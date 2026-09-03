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

// Replace isoToSheetDate with this normalizing function:
function normalizeDateStr(dStr: string): string {
  if (!dStr) return "";
  const parts = dStr.trim().split(/[-/]/);
  if (parts.length !== 3) return dStr.trim();
  // If format is YYYY-MM-DD
  if (parts[0].length === 4) {
    return `${Number(parts[2])}-${Number(parts[1])}-${parts[0]}`;
  }
  // If format is D-M-YYYY or DD-MM-YYYY -> outputs D-M-YYYY
  return `${Number(parts[0])}-${Number(parts[1])}-${parts[2]}`;
}

function getDatesInRange(startDateIso: string, endDateIso: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDateIso);
  const end = new Date(endDateIso);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(normalizeDateStr(d.toISOString().slice(0, 10)));
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

 // Define your 4000 multiplier ET names here (place outside the loop)
const SPECIAL_4000_ETS = [
"JSG30MET",
    "JSG43",
    "JSG55",
    "JSG50",
    "JSG26",
    "JSG41",
    "JSG45",
    "JSG48MET"
];

for (const tab of targetTabs) {
  try {
    const cleanedTabName = tab.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    // Check if cleaned tab matches any special ET name
    const isSpecialET = SPECIAL_4000_ETS.some((et) => cleanedTabName.includes(et));
    const rowMultiplier = isSpecialET ? 4000 : 5000;

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
if (!targetedSheetDates.includes(normalizeDateStr(rawDate)) || !currentTemplate) continue;

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
          const existingItem = breakdownMap.get(groupKey) || {
            template: currentTemplate,
            campaignSrc: campaignHeader,
            etSource: tab,
            count: 0,
            multiplier: rowMultiplier,
          };

          breakdownMap.set(groupKey, {
            template: currentTemplate,
            campaignSrc: campaignHeader,
            etSource: tab,
            count: existingItem.count + countValue,
            multiplier: rowMultiplier,
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
