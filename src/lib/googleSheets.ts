import { google } from "googleapis";

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const RAW_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

if (!SPREADSHEET_ID || !CLIENT_EMAIL || !RAW_PRIVATE_KEY) {
  // These checks run only on the server. In dev, this will help catch misconfiguration early.
  console.warn(
    "[googleSheets] Missing one or more Google Sheets environment variables. " +
      "Ensure GOOGLE_SHEETS_ID, GOOGLE_CLIENT_EMAIL, and GOOGLE_PRIVATE_KEY are set in .env.local.",
  );
}

function getPrivateKey(): string {
  // Support the common pattern of storing the key with \n in env.
  return RAW_PRIVATE_KEY?.replace(/\\n/g, "\n") ?? "";
}

async function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: getPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({
    version: "v4",
    auth,
  });

  return sheets;
}

// Simple in-memory cache for tab names to avoid repeated metadata calls.
let cachedTabs: string[] | null = null;
let cachedTabsFetchedAt: number | null = null;
const TABS_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function listETTabs(): Promise<string[]> {
  if (!SPREADSHEET_ID) return [];

  const now = Date.now();
  if (cachedTabs && cachedTabsFetchedAt && now - cachedTabsFetchedAt < TABS_TTL_MS) {
    return cachedTabs;
  }

  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const tabs =
    res.data.sheets
      ?.map((s) => s.properties?.title)
      .filter((title): title is string => Boolean(title)) ?? [];

  cachedTabs = tabs;
  cachedTabsFetchedAt = Date.now();

  return tabs;
}

function isoToSheetDate(isoDate: string): string {
  // isoDate is expected as YYYY-MM-DD from the <input type="date" /> on the client.
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}-${month}-${year}`;
}

function normalizeCell(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

type ParsedDate = {
  day: number;
  month: number;
  year: number;
};

/**
 * Parse a sheet cell date that might be in DD-MM-YYYY or MM-DD-YYYY (also supports / or .).
 * Returns one or more possible interpretations so we can compare against the target date.
 */
function parseCellDateVariants(raw: string): ParsedDate[] {
  const text = normalizeCell(raw);
  if (!text) return [];

  // Match things like 14-05-2025, 05/14/25, 14.05.25 etc.
  const match = text.match(/^(\d{1,2})\D(\d{1,2})\D(\d{2,4})$/);
  if (!match) return [];

  const [, firstStr, secondStr, yStr] = match;
  const first = Number(firstStr);
  const second = Number(secondStr);
  const year = Number(yStr.length === 2 ? `20${yStr}` : yStr);

  if (Number.isNaN(first) || Number.isNaN(second) || Number.isNaN(year)) {
    return [];
  }

  const variants: ParsedDate[] = [];

  // Treat as day-first (DD-MM-YYYY).
  if (first >= 1 && first <= 31 && second >= 1 && second <= 12) {
    variants.push({ day: first, month: second, year });
  }

  // Treat as month-first (MM-DD-YYYY).
  if (first >= 1 && first <= 12 && second >= 1 && second <= 31) {
    const candidate: ParsedDate = { day: second, month: first, year };
    if (!variants.some((v) => v.day === candidate.day && v.month === candidate.month && v.year === candidate.year)) {
      variants.push(candidate);
    }
  }

  return variants;
}

type MailCountsParams = {
  isoDate: string; // YYYY-MM-DD coming from the client
  campaign: string;
  etNameOrAll: string; // specific ET tab name or "ALL"
};

export type MailCountsResult = {
  totalMails: number;
  totalCount: number;
  hadData: boolean;
};

async function getMailCountForSingleTab(
  sheetTitle: string,
  { isoDate, campaign }: { isoDate: string; campaign: string },
): Promise<number> {
  if (!SPREADSHEET_ID) return 0;

  const sheets = await getSheetsClient();
  const formattedDate = isoToSheetDate(isoDate);
  const [targetYearStr, targetMonthStr, targetDayStr] = isoDate.split("-");
  const targetDate: ParsedDate | null =
    targetYearStr && targetMonthStr && targetDayStr
      ? {
          day: Number(targetDayStr),
          month: Number(targetMonthStr),
          year: Number(targetYearStr),
        }
      : null;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetTitle}'!A:ZZ`,
    valueRenderOption: "FORMATTED_VALUE",
  });

  const values = res.data.values ?? [];
  if (values.length === 0) return 0;

  const headerRow = values[0] ?? [];

  // Find the campaign column index (skip column A, which is Date).
  const targetCampaign = campaign.trim().toLowerCase();
  const campaignColIndex = headerRow.findIndex((cell, index) => {
    if (index === 0) return false;
    const cellText = normalizeCell(cell).toLowerCase();
    return cellText === targetCampaign;
  });

  if (campaignColIndex === -1) {
    return 0;
  }

  // Find the row where column A matches the formatted date.
  let foundRow: (string | number)[] | undefined;

  for (let i = 1; i < values.length; i += 1) {
    const row = values[i];
    const rawDateCell = normalizeCell(row[0]);
    if (!rawDateCell) continue;

    // Direct string match first (for exact DD-MM-YYYY).
    if (formattedDate.toLowerCase() === rawDateCell.toLowerCase()) {
      foundRow = row;
      break;
    }

    if (targetDate) {
      const variants = parseCellDateVariants(rawDateCell);
      const matchesTarget = variants.some(
        (v) =>
          v.day === targetDate.day &&
          v.month === targetDate.month &&
          v.year === targetDate.year,
      );
      if (matchesTarget) {
        foundRow = row;
        break;
      }
    }
  }

  if (!foundRow) {
    return 0;
  }

  const rawCount = foundRow[campaignColIndex];
  const normalized = normalizeCell(rawCount);
  if (!normalized) return 0;

  const asNumber = Number(normalized);
  if (Number.isNaN(asNumber)) {
    return 0;
  }

  return asNumber;
}

export async function getMailCounts({
  isoDate,
  campaign,
  etNameOrAll,
}: MailCountsParams): Promise<MailCountsResult> {
  if (!SPREADSHEET_ID) {
    return { totalMails: 0, totalCount: 0, hadData: false };
  }

  const trimmedCampaign = campaign.trim();
  if (!isoDate || !trimmedCampaign) {
    return { totalMails: 0, totalCount: 0, hadData: false };
  }

  const tabs = await listETTabs();
  if (tabs.length === 0) {
    return { totalMails: 0, totalCount: 0, hadData: false };
  }

  const targetIsAll = etNameOrAll.toUpperCase() === "ALL";
  const targetTabs = targetIsAll
    ? tabs
    : tabs.filter((t) => normalizeCell(t).toLowerCase() === etNameOrAll.trim().toLowerCase());

  if (targetTabs.length === 0) {
    return { totalMails: 0, totalCount: 0, hadData: false };
  }

  const counts = await Promise.all(
    targetTabs.map(async (tab) => {
      try {
        const count = await getMailCountForSingleTab(tab, {
          isoDate,
          campaign: trimmedCampaign,
        });
        return count;
      } catch (err) {
        console.error(`[googleSheets] Failed to read tab "${tab}":`, err);
        return 0;
      }
    }),
  );

  const total = counts.reduce((sum, value) => sum + value, 0);

  const hadData = total > 0;
  const totalCount = total * 5000;

  return { totalMails: total, totalCount, hadData };
}

export async function listCampaigns(etNameOrAll: string): Promise<string[]> {
  if (!SPREADSHEET_ID) return [];

  const tabs = await listETTabs();
  if (tabs.length === 0) return [];

  const targetIsAll = etNameOrAll.toUpperCase() === "ALL";
  const targetTabs = targetIsAll
    ? tabs
    : tabs.filter((t) => normalizeCell(t).toLowerCase() === etNameOrAll.trim().toLowerCase());

  if (targetTabs.length === 0) return [];

  const sheets = await getSheetsClient();
  const campaigns = new Set<string>();

  for (const tab of targetTabs) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${tab}'!1:1`,
        valueRenderOption: "FORMATTED_VALUE",
      });
      const headerRow = (res.data.values?.[0] ?? []) as unknown[];
      headerRow.slice(1).forEach((cell) => {
        const text = normalizeCell(cell);
        if (text) {
          campaigns.add(text);
        }
      });
    } catch (err) {
      console.error(`[googleSheets] Failed to read header row for tab "${tab}":`, err);
    }
  }

  return Array.from(campaigns).sort((a, b) => a.localeCompare(b));
}

