import Papa from "papaparse"

export interface GdpRecord {
  countryCode: string
  countryName: string
  year: number
  gdp: number | null
}

const MIN_YEAR = 1960
const MAX_YEAR = 2022

async function fetchGdpData(): Promise<GdpRecord[]> {
  const response = await fetch("/data/gdp_data.csv")
  const text = await response.text()

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  })

  const records: GdpRecord[] = []

  for (const row of parsed.data) {
    const countryCode = row["Country Code"]
    const countryName = row["Country Name"]
    if (!countryCode) continue

    for (let year = MIN_YEAR; year <= MAX_YEAR; year++) {
      const raw = row[String(year)]
      const gdp = raw && raw.trim() !== "" ? parseFloat(raw) : null
      records.push({ countryCode, countryName, year, gdp })
    }
  }

  return records
}

export const base44 = {
  entities: {
    GdpData: {
      list: fetchGdpData,
    },
  },
}
