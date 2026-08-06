import { useState, useMemo } from "react"
import { base44 } from "@/api/base44Client"
import type { GdpRecord } from "@/api/base44Client"
import { useQuery } from "@tanstack/react-query"
import { TrendingUp, BarChart3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts"
import PageHeader from "@/components/shared/PageHeader"
import EmptyState from "@/components/shared/EmptyState"
import { cn } from "@/lib/utils"

const COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(160, 55%, 40%)",
  "hsl(0, 72%, 51%)",
  "hsl(35, 90%, 55%)",
  "hsl(270, 60%, 55%)",
  "hsl(190, 80%, 42%)",
  "hsl(330, 65%, 50%)",
  "hsl(120, 50%, 40%)",
]

const DEFAULT_COUNTRIES = ["DEU", "FRA", "GBR", "BRA", "MEX", "JPN"]

function formatBillions(value: number): string {
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}T`
  return `${value.toFixed(0)}B`
}

export default function GdpDashboard() {
  const [fromYear, setFromYear] = useState("1960")
  const [toYear, setToYear] = useState("2022")
  const [selectedCountries, setSelectedCountries] = useState<string[]>(DEFAULT_COUNTRIES)
  const [view, setView] = useState<"chart" | "table">("chart")

  const { data: gdpData = [], isLoading } = useQuery({
    queryKey: ["gdp-data"],
    queryFn: () => base44.entities.GdpData.list(),
  })

  const countryList = useMemo(() => {
    const seen = new Map<string, string>()
    gdpData.forEach((r) => {
      if (r.countryCode && !seen.has(r.countryCode)) {
        seen.set(r.countryCode, r.countryName)
      }
    })
    return Array.from(seen.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [gdpData])

  const years = useMemo(() => {
    const set = new Set<number>()
    gdpData.forEach((r) => set.add(r.year))
    return Array.from(set).sort((a, b) => a - b)
  }, [gdpData])

  const filteredData = useMemo(() => {
    const from = parseInt(fromYear)
    const to = parseInt(toYear)
    return gdpData.filter(
      (r) =>
        selectedCountries.includes(r.countryCode) &&
        r.year >= from &&
        r.year <= to
    )
  }, [gdpData, selectedCountries, fromYear, toYear])

  const chartData = useMemo(() => {
    const from = parseInt(fromYear)
    const to = parseInt(toYear)
    const byYear = new Map<number, Record<string, number | null>>()

    for (let y = from; y <= to; y++) {
      byYear.set(y, { year: y })
    }

    filteredData.forEach((r) => {
      const row = byYear.get(r.year)
      if (row) row[r.countryCode] = r.gdp
    })

    return Array.from(byYear.values())
  }, [filteredData, fromYear, toYear])

  const metrics = useMemo(() => {
    const from = parseInt(fromYear)
    const to = parseInt(toYear)

    return selectedCountries.map((code) => {
      const firstRow = gdpData.find((r) => r.countryCode === code && r.year === from)
      const lastRow = gdpData.find((r) => r.countryCode === code && r.year === to)
      const firstGdp = firstRow?.gdp ? firstRow.gdp / 1e9 : null
      const lastGdp = lastRow?.gdp ? lastRow.gdp / 1e9 : null
      const growth = firstGdp && lastGdp ? lastGdp / firstGdp : null

      return { code, lastGdp, growth }
    })
  }, [gdpData, selectedCountries, fromYear, toYear])

  const tableData = useMemo(() => {
    const from = parseInt(fromYear)
    const to = parseInt(toYear)

    return selectedCountries.map((code) => {
      const rows = gdpData.filter(
        (r) => r.countryCode === code && r.year >= from && r.year <= to && r.gdp !== null
      )
      const name = countryList.find((c) => c.code === code)?.name ?? code
      return { code, name, rows }
    })
  }, [gdpData, selectedCountries, fromYear, toYear, countryList])

  function toggleCountry(code: string) {
    setSelectedCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <PageHeader title="GDP Dashboard" subtitle="Loading data..." />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <PageHeader
        title="GDP Dashboard"
        subtitle="Browse GDP data from the World Bank Open Data. Data covers 1960-2022."
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">From</span>
          <Select value={fromYear} onValueChange={setFromYear}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">To</span>
          <Select value={toYear} onValueChange={setToYear}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex rounded-lg border overflow-hidden text-xs">
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-2 font-medium transition-colors",
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {v === "chart" ? "Chart" : "Table"}
            </button>
          ))}
        </div>

        <Badge variant="outline" className="text-xs">
          {selectedCountries.length} countries selected
        </Badge>
      </div>

      {/* Country multi-select */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Select Countries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
            {countryList.map(({ code }) => (
              <button
                key={code}
                onClick={() => toggleCountry(code)}
                className={cn(
                  "px-2 py-1 rounded text-xs transition-colors border",
                  selectedCountries.includes(code)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {code}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {view === "chart" ? (
        <>
          {/* Line Chart */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                GDP Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 && selectedCountries.length > 0 ? (
                <ResponsiveContainer width="100%" height={420}>
                  <LineChart data={chartData} margin={{ left: 10, right: 8, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,90%)" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => String(v)}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: number) => `$${(v / 1e12).toFixed(1)}T`}
                    />
                    <Tooltip
                      formatter={(v) => [
                        `$${(Number(v) / 1e9).toFixed(1)}B`,
                      ]}
                      labelFormatter={(label) => `Year: ${label}`}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {selectedCountries.map((code, i) => (
                      <Line
                        key={code}
                        type="monotone"
                        dataKey={code}
                        name={code}
                        stroke={COLORS[i % COLORS.length]}
                        dot={false}
                        strokeWidth={2}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title="No data"
                  description="Select at least one country to display the chart"
                />
              )}
            </CardContent>
          </Card>

          {/* Metric Cards */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              GDP in {toYear}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map((m) => (
                <Card key={m.code}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {m.code} GDP
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {m.lastGdp !== null ? `$${formatBillions(m.lastGdp)}` : "n/a"}
                    </div>
                    <Badge
                      variant={m.growth !== null && m.growth >= 1 ? "default" : "secondary"}
                      className="mt-1"
                    >
                      {m.growth !== null ? `${m.growth.toFixed(2)}x` : "n/a"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Table View */
        <div className="space-y-6">
          {tableData.map((country) => (
            <Card key={country.code}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {country.name} ({country.code})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Year</th>
                        <th className="text-right py-2 px-3 font-semibold text-muted-foreground">GDP (USD)</th>
                        <th className="text-right py-2 px-3 font-semibold text-muted-foreground">GDP (Billions)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {country.rows.map((r: GdpRecord) => (
                        <tr key={r.year} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="py-1.5 px-3 font-medium">{r.year}</td>
                          <td className="text-right py-1.5 px-3 text-muted-foreground font-mono">
                            {r.gdp !== null ? `$${r.gdp.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}
                          </td>
                          <td className="text-right py-1.5 px-3 font-semibold">
                            {r.gdp !== null ? `$${(r.gdp / 1e9).toFixed(1)}B` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
