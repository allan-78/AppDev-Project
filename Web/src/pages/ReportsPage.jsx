import React, { useEffect, useState } from "react";
import { Search, Download, FileText, TrendingUp, Users, Wrench, DollarSign, Activity, BarChart3, PieChart, Calendar, ChevronDown, Printer } from "lucide-react";
import { api } from "../api/client";
import { LineChart, BarChart, DoughnutChart, Legend } from "../components/Chart";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("inventory");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({});
  const [exporting, setExporting] = useState(false);

  async function generateReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: reportType });
      if (dateRange.start) params.set("startDate", dateRange.start);
      if (dateRange.end) params.set("endDate", dateRange.end);
      const data = await api(`/admin/reports?${params.toString()}`);
      setReportData(data.report || []);
      setSummary(data.summary || {});
    } catch (e) {
      console.error("Failed to generate report:", e);
      setReportData([]);
      setSummary({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { generateReport().catch(() => {}); }, [reportType]);

  async function exportPDF() {
    setExporting(true);
    try {
      window.open(`/api/admin/reports/export?type=${reportType}${dateRange.start ? `&startDate=${dateRange.start}` : ""}${dateRange.end ? `&endDate=${dateRange.end}` : ""}`, "_blank");
    } finally {
      setTimeout(() => setExporting(false), 2000);
    }
  }

  const chartData = reportData.map((item, index) => ({
    label: item.name || item.date || `Item ${index + 1}`,
    value: item.count || item.amount || item.trustPoints || 1
  }));

  const reportIcons = {
    inventory: Wrench,
    trust: Users,
    transactions: DollarSign,
    borrowings: Activity
  };

  const ReportIcon = reportIcons[reportType] || FileText;

  // Stats from summary
  const summaryArray = Object.entries(summary).map(([key, value]) => ({ key, value }));

  return (
    <section>
      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Report Type", value: reportType.charAt(0).toUpperCase() + reportType.slice(1), icon: ReportIcon, color: "#0b1f33", bg: "#f7f4ed" },
          { label: "Data Points", value: reportData.length, icon: TrendingUp, color: "#3b82f6", bg: "#eff6ff" },
          { label: "Start", value: dateRange.start || "All time", icon: Calendar, color: "#64748b", bg: "#f1f5f9" },
          { label: "End", value: dateRange.end || "Present", icon: Calendar, color: "#64748b", bg: "#f1f5f9" }
        ].map((card, i) => (
          <div key={i} style={{ backgroundColor: card.bg, borderRadius: 12, padding: 14 }}>
            <card.icon size={18} color={card.color} />
            <div style={{ fontSize: 20, fontWeight: "900", color: card.color, marginTop: 6 }}>{card.value}</div>
            <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20, padding: 16, backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={{ fontSize: 10, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4, display: "block" }}>Report Type</label>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)} style={{ padding: "8px 10px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 13, width: "100%", backgroundColor: "#fff" }}>
            <option value="inventory">📦 Inventory Report</option>
            <option value="trust">⭐ Trust Points Report</option>
            <option value="transactions">💳 Transaction History</option>
            <option value="borrowings">🔄 Borrowing Activity</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 130 }}>
          <label style={{ fontSize: 10, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4, display: "block" }}>Start Date</label>
          <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            style={{ padding: "8px 10px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 13, width: "100%" }} />
        </div>
        <div style={{ flex: 1, minWidth: 130 }}>
          <label style={{ fontSize: 10, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4, display: "block" }}>End Date</label>
          <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            style={{ padding: "8px 10px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 13, width: "100%" }} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <button onClick={generateReport} disabled={loading}
            style={{ padding: "8px 16px", backgroundColor: "#0b1f33", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: "700", display: "flex", alignItems: "center", gap: 6 }}>
            {loading ? "Generating..." : "Generate Report"}
          </button>
          <button onClick={exportPDF} disabled={exporting}
            style={{ padding: "8px 16px", backgroundColor: "#f1f5f9", color: "#0b1f33", border: "1px solid #ded8cc", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: "600", display: "flex", alignItems: "center", gap: 6 }}>
            <Download size={14} /> {exporting ? "Sending..." : "Export PDF"}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {summaryArray.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
            {summaryArray.map((item, i) => (
              <div key={i} style={{ backgroundColor: "#fff", borderRadius: 12, padding: 14, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 22, fontWeight: "900", color: "#0b1f33" }}>{item.value}</div>
                <div style={{ fontSize: 10, color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>{item.key.replace(/([A-Z])/g, " $1").trim()}</div>
              </div>
            ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div style={{ backgroundColor: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e2e8f0", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 14, color: "#0b1f33", fontWeight: "700", display: "flex", alignItems: "center", gap: 6 }}>
              <BarChart3 size={14} /> {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Overview
            </h3>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{chartData.length} data points</span>
          </div>
          <BarChart data={chartData} color="#0b1f33" height={250} />
          {chartData.length > 0 && <Legend data={chartData} />}
        </div>
      )}

      {/* Detailed Results Table */}
      {reportData.length > 0 && (
        <div style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 14, color: "#0b1f33", fontWeight: "700" }}>Detailed Results ({reportData.length} items)</h3>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              {dateRange.start ? `${dateRange.start} to ${dateRange.end || "now"}` : "All time"}
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f7f4ed" }}>
                  {Object.keys(reportData[0]).map((key) => (
                    <th key={key} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    {Object.values(row).map((value, i) => (
                      <td key={i} style={{ padding: "10px 12px", fontSize: 12, color: "#475569" }}>
                        {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && reportData.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
          <FileText size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ fontSize: 14, fontWeight: "600" }}>No data available</p>
          <p style={{ fontSize: 12 }}>Try selecting a different report type or date range.</p>
        </div>
      )}
    </section>
  );
}