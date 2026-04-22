import { useState, useEffect } from "react";
/* eslint-disable react-hooks/exhaustive-deps */
import axios from "axios";
import { API, useAuth, useLocation2 } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  BarChart3,
  MapPin,
  TrendingUp,
  Users,
  Sparkles,
  FileText,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  Repeat,
  Wallet,
  Calendar,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  CalendarDays
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Statistics = () => {
  const { user } = useAuth();
  const { selectedLocation, locationForApi } = useLocation2();
  const [dailyStats, setDailyStats] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [workerStats, setWorkerStats] = useState([]);
  const [serviceStats, setServiceStats] = useState([]);
  const [locationStats, setLocationStats] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [advancedStats, setAdvancedStats] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [historyStats, setHistoryStats] = useState(null);
  const [reportPeriod, setReportPeriod] = useState("daily");
  const [reportDate, setReportDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [generatingReport, setGeneratingReport] = useState(false);

  const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#ec4899', '#14b8a6'];

  const fetchStats = async () => {
    try {
      const locationParam = locationForApi ? `?location=${locationForApi}` : "";
      const [dailyRes, monthlyRes, workerRes, serviceRes, locationRes, dashRes, advancedRes] = await Promise.all([
        axios.get(`${API}/stats/daily${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/stats/monthly${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/stats/workers${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/stats/services${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/stats/locations`, { withCredentials: true }),
        axios.get(`${API}/stats/dashboard${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/stats/advanced${locationParam}`, { withCredentials: true })
      ]);
      setDailyStats(dailyRes.data);
      setMonthlyStats(monthlyRes.data);
      setWorkerStats(workerRes.data);
      setServiceStats(serviceRes.data.slice(0, 10));
      // Only show Debrecen location
      setLocationStats(locationRes.data.filter(loc => loc.location === 'Debrecen'));
      setDashboardStats(dashRes.data);
      setAdvancedStats(advancedRes.data);
      // Forecast (separate, non-blocking)
      try {
        const fRes = await axios.get(`${API}/stats/forecast${locationParam}`, { withCredentials: true });
        setForecast(fRes.data?.error ? null : fRes.data);
      } catch { setForecast(null); }
    } catch (error) {
      toast.error("Hiba a statisztikák betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryStats = async (date) => {
    try {
      const locationParam = locationForApi ? `&location=${locationForApi}` : "";
      const res = await axios.get(`${API}/stats/daily-history?date=${date}${locationParam}`, { withCredentials: true });
      setHistoryStats(res.data);
    } catch (error) {
      // If endpoint doesn't exist, calculate from jobs
      try {
        const locationParam = locationForApi ? `&location=${locationForApi}` : "";
        const jobsRes = await axios.get(`${API}/jobs?date=${date}${locationParam}&status=kesz`, { withCredentials: true });
        const jobs = jobsRes.data || [];

        const cashTotal = jobs.filter(j => j.payment_method === 'keszpenz').reduce((sum, j) => sum + (j.price || 0), 0);
        const cardTotal = jobs.filter(j => ['kartya', 'bankkartya'].includes(j.payment_method)).reduce((sum, j) => sum + (j.price || 0), 0);
        const transferTotal = jobs.filter(j => ['atutalas', 'utalas', 'banki_atutalas'].includes(j.payment_method)).reduce((sum, j) => sum + (j.price || 0), 0);

        setHistoryStats({
          date: date,
          cars_completed: jobs.length,
          cash_revenue: cashTotal,
          card_revenue: cardTotal,
          transfer_revenue: transferTotal,
          total_revenue: cashTotal + cardTotal + transferTotal
        });
      } catch (e) {
        setHistoryStats(null);
      }
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchStats();
  }, [selectedLocation]);

  useEffect(() => {
    const handleDataChanged = () => {
      fetchStats();
      if (selectedDate !== format(new Date(), "yyyy-MM-dd")) {
        fetchHistoryStats(selectedDate);
      }
    };
    window.addEventListener("xclean:data-changed", handleDataChanged);
    return () => window.removeEventListener("xclean:data-changed", handleDataChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation, selectedDate]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedDate !== format(new Date(), "yyyy-MM-dd")) {
      fetchHistoryStats(selectedDate);
    } else {
      setHistoryStats(null);
    }
  }, [selectedDate, selectedLocation]);

  const navigateDate = (direction) => {
    const current = new Date(selectedDate);
    const newDate = direction === 'prev'
      ? new Date(current.setDate(current.getDate() - 1))
      : new Date(current.setDate(current.getDate() + 1));

    // Don't allow future dates
    if (newDate <= new Date()) {
      setSelectedDate(format(newDate, "yyyy-MM-dd"));
    }
  };

  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");
  const forecastConfidence = Math.max(0, Math.min(100, Number(forecast?.confidence || 0)));
  const confidenceLabel = forecastConfidence >= 80 ? "Magas" : forecastConfidence >= 60 ? "Közepes" : "Alacsony";
  const confidenceTone = forecastConfidence >= 80
    ? "text-green-300 bg-green-500/20 border-green-400/30"
    : forecastConfidence >= 60
      ? "text-amber-300 bg-amber-500/20 border-amber-400/30"
      : "text-red-300 bg-red-500/20 border-red-400/30";
  const forecastMin = Number(forecast?.pessimistic_revenue ?? forecast?.predicted_revenue ?? 0);
  const forecastMax = Number(forecast?.optimistic_revenue ?? forecast?.predicted_revenue ?? 0);
  const forecastExpected = Number(forecast?.predicted_revenue ?? 0);
  const forecastSpan = Math.max(0, forecastMax - forecastMin);
  const forecastUncertaintyPct = forecastExpected > 0
    ? Math.min(100, Math.max(0, Math.round((forecastSpan / forecastExpected) * 100)))
    : 0;
  const expectedMarkerPct = forecastMax > forecastMin
    ? Math.min(100, Math.max(0, ((forecastExpected - forecastMin) / (forecastMax - forecastMin)) * 100))
    : 50;

  const generatePDF = async () => {
    setGeneratingReport(true);
    try {
      const locationParam = locationForApi ? `&location=${locationForApi}` : "";
      const res = await axios.get(
        `${API}/stats/report?period=${reportPeriod}&date=${reportDate}${locationParam}`,
        { withCredentials: true }
      );
      const report = res.data;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const periodLabels = { daily: "Napi", weekly: "Heti", monthly: "Havi" };

      // Title
      doc.setFontSize(20);
      doc.setTextColor(34, 197, 94);
      doc.text(`X-CLEAN ${periodLabels[reportPeriod]} Riport`, pageWidth / 2, 20, { align: "center" });

      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Idoszak: ${report.date_range.start} - ${report.date_range.end}`, pageWidth / 2, 28, { align: "center" });
      doc.text(`Telephely: ${report.location}  |  Generalva: ${format(new Date(), "yyyy.MM.dd HH:mm", { locale: hu })}`, pageWidth / 2, 34, { align: "center" });

      let yPos = 44;

      // Summary table
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Osszesites", 14, yPos);
      yPos += 6;
      autoTable(doc, {
        startY: yPos,
        head: [["Mutato", "Ertek"]],
        body: [
          ["Elkeszult autok", report.summary.total_cars.toString()],
          ["Osszes bevetel", `${report.summary.total_revenue.toLocaleString()} Ft`],
          ["Keszpenz bevetel", `${report.summary.cash_revenue.toLocaleString()} Ft`],
          ["Kartya bevetel", `${report.summary.card_revenue.toLocaleString()} Ft`],
          ["Átutalás bevétel", `${(report.summary.transfer_revenue || 0).toLocaleString()} Ft`],
          ["Atlag bevetel / auto", report.summary.total_cars > 0 ? `${Math.round(report.summary.total_revenue / report.summary.total_cars).toLocaleString()} Ft` : "0 Ft"],
        ],
        theme: "striped",
        headStyles: { fillColor: [34, 197, 94] },
        styles: { fontSize: 10 },
      });
      yPos = doc.lastAutoTable.finalY + 12;

      // Worker breakdown
      if (report.worker_breakdown.length > 0) {
        if (yPos > 220) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Dolgozoi teljesitmeny", 14, yPos);
        yPos += 6;
        autoTable(doc, {
          startY: yPos,
          head: [["Dolgozo", "Autok", "Bevetel", "Keszpenz", "Kartya", "Utalas"]],
          body: report.worker_breakdown.map((w) => [
            w.name,
            w.cars.toString(),
            `${w.revenue.toLocaleString()} Ft`,
            `${w.cash.toLocaleString()} Ft`,
            `${w.card.toLocaleString()} Ft`,
            `${(w.transfer || 0).toLocaleString()} Ft`,
          ]),
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 10 },
        });
        yPos = doc.lastAutoTable.finalY + 12;
      }

      // Worker service breakdown
      if (report.worker_breakdown.length > 0) {
        if (yPos > 200) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14);
        doc.text("Szolgaltatas bontás dolgozoknent", 14, yPos);
        yPos += 6;

        const serviceRows = [];
        for (const w of report.worker_breakdown) {
          for (const s of w.services) {
            serviceRows.push([w.name, s.name, s.count.toString()]);
          }
        }
        if (serviceRows.length > 0) {
          autoTable(doc, {
            startY: yPos,
            head: [["Dolgozo", "Szolgaltatas", "Darab"]],
            body: serviceRows,
            theme: "striped",
            headStyles: { fillColor: [168, 85, 247] },
            styles: { fontSize: 9 },
          });
          yPos = doc.lastAutoTable.finalY + 12;
        }
      }

      // Service breakdown
      if (report.service_breakdown.length > 0) {
        if (yPos > 200) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14);
        doc.text("Szolgaltatas statisztika", 14, yPos);
        yPos += 6;
        autoTable(doc, {
          startY: yPos,
          head: [["Szolgaltatas", "Darab", "Bevetel"]],
          body: report.service_breakdown.map((s) => [
            s.name,
            s.count.toString(),
            `${s.revenue.toLocaleString()} Ft`,
          ]),
          theme: "striped",
          headStyles: { fillColor: [249, 115, 22] },
          styles: { fontSize: 10 },
        });
        yPos = doc.lastAutoTable.finalY + 12;
      }

      // Daily breakdown (for weekly/monthly)
      if (reportPeriod !== "daily" && report.daily_breakdown.length > 0) {
        if (yPos > 180) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14);
        doc.text("Napi bontas", 14, yPos);
        yPos += 6;
        autoTable(doc, {
          startY: yPos,
          head: [["Datum", "Autok", "Bevetel", "Keszpenz", "Kartya", "Utalas"]],
          body: report.daily_breakdown.map((d) => [
            d.date,
            d.cars.toString(),
            `${d.revenue.toLocaleString()} Ft`,
            `${d.cash.toLocaleString()} Ft`,
            `${d.card.toLocaleString()} Ft`,
            `${(d.transfer || 0).toLocaleString()} Ft`,
          ]),
          theme: "striped",
          headStyles: { fillColor: [20, 184, 166] },
          styles: { fontSize: 9 },
        });
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`X-CLEAN Menedzsment - Oldal ${i}/${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
      }

      // Save
      const periodSlug = { daily: "napi", weekly: "heti", monthly: "havi" };
      const fileName = `xclean_${periodSlug[reportPeriod]}_riport_${reportDate}.pdf`;
      const blob = doc.output("blob");

      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{ description: "PDF dokumentum", accept: { "application/pdf": [".pdf"] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          toast.success("PDF mentve!");
          return;
        } catch (err) {
          if (err.name === "AbortError") return;
        }
      }

      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success("PDF megnyitva - mentsd el Ctrl+S-sel!");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error("Report generation error:", error);
      toast.error("Hiba a riport generalasanal");
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleExportCSV = () => {
    // Build rows from current state
    const now = format(new Date(), "yyyy-MM-dd");
    const location = locationForApi || "Összes";

    // Monthly stats CSV
    if (monthlyStats.length > 0) {
      const rows = [
        [`X-CLEAN Havi statisztika – ${location} – exportálva: ${now}`],
        [],
        ["Hónap", "Autók (db)", "Bevétel (Ft)", "Készpénz (Ft)", "Kártya (Ft)", "Átutalás (Ft)"],
        ...monthlyStats.map(m => [
          m.month,
          m.count,
          m.revenue,
          m.cash || "",
          m.card || "",
          m.transfer || "",
        ]),
      ];
      const csv = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `xclean_havi_stat_${now}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    // Worker stats CSV
    if (workerStats.length > 0) {
      const rows2 = [
        [`X-CLEAN Dolgozói statisztika – ${location} – exportálva: ${now}`],
        [],
        ["Dolgozó", "Autók (db)", "Bevétel (Ft)", "Készpénz (Ft)", "Kártya (Ft)", "Átutalás (Ft)", "Jutalék (Ft)"],
        ...workerStats.map(w => [
          w.worker_name || w.name || "",
          w.cars || w.count || 0,
          w.revenue || 0,
          w.cash || "",
          w.card || "",
          w.transfer || "",
          w.commission || "",
        ]),
      ];
      const csv2 = rows2.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
      const blob2 = new Blob(["\uFEFF" + csv2], { type: "text/csv;charset=utf-8;" });
      const url2 = URL.createObjectURL(blob2);
      const a2 = document.createElement("a");
      a2.href = url2;
      a2.download = `xclean_dolgozo_stat_${now}.csv`;
      a2.click();
      URL.revokeObjectURL(url2);
    }

    toast.success("CSV fájlok letöltve");
  };

  const CustomTooltip = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-400 text-sm mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-white font-semibold">
              {entry.name}: {formatter ? formatter(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Betöltés...</div>
      </div>
    );
  }

  // Section divider helper
  const SectionDivider = ({ icon, label }) => (
    <div className="flex items-center gap-3 mt-2">
      <h2 className="text-white font-semibold text-base whitespace-nowrap flex items-center gap-2">
        {icon} {label}
      </h2>
      <div className="flex-1 h-px bg-slate-800" />
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="statistics-page">

      {/* ── Section 1: Header + Riport generálás ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Manrope']">Statisztika</h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">Részletes kimutatások</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
            <MapPin className="w-4 h-4 text-green-400" />
            <span className="text-sm text-white">{selectedLocation === "all" ? "Összes" : selectedLocation}</span>
          </div>
        </div>
      </div>

      <Card className="glass-card border-green-500/20">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-400" />
              <span className="text-white font-medium">Riport generálás</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Select value={reportPeriod} onValueChange={setReportPeriod}>
                <SelectTrigger className="w-[120px] bg-slate-900 border-slate-700 text-white text-sm" data-testid="report-period-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="daily" className="text-white">Napi</SelectItem>
                  <SelectItem value="weekly" className="text-white">Heti</SelectItem>
                  <SelectItem value="monthly" className="text-white">Havi</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
                className="bg-slate-900 border-slate-700 text-white w-40 h-9 text-sm"
                data-testid="report-date-input"
              />
              <Button
                onClick={generatePDF}
                disabled={generatingReport}
                className="bg-green-600 hover:bg-green-500 w-full sm:w-auto"
                data-testid="generate-report-btn"
              >
                <Download className="w-4 h-4 mr-2" />
                {generatingReport ? "Generálás..." : "PDF Letöltés"}
              </Button>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="border-green-700/50 text-green-400 hover:bg-green-500/10 w-full sm:w-auto"
                title="Havi és dolgozói adatok CSV-be"
              >
                <Download className="w-4 h-4 mr-2" />
                CSV Export
              </Button>
            </div>
          </div>
          <p className="text-slate-500 text-xs mt-2">
            {reportPeriod === "daily" && "Kiválasztott nap részletes bontása: dolgozónkénti autószám, szolgáltatás, bevétel, készpénz/kártya."}
            {reportPeriod === "weekly" && "Kiválasztott hét (H-V) összesítése: dolgozónkénti teljesítmény, szolgáltatások, napi bontás."}
            {reportPeriod === "monthly" && "Kiválasztott hónap összesítése: dolgozónkénti teljesítmény, szolgáltatások, napi bontás."}
          </p>
        </CardContent>
      </Card>

      {/* ── Section 2: Mai & Havi összesítő ── */}
      <div className="mt-6">
        <SectionDivider icon="📊" label="Mai & Havi összesítő" />
      </div>

      {dashboardStats && (
        <div className="space-y-4">
          {/* Date Navigator */}
          <Card className="glass-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-green-400" />
                  <span className="text-white font-medium">Napi statisztika</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateDate('prev')}
                    className="border-slate-700 h-8 px-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={format(new Date(), "yyyy-MM-dd")}
                    className="bg-slate-900 border-slate-700 text-white w-40 h-8 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateDate('next')}
                    disabled={isToday}
                    className="border-slate-700 h-8 px-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  {!isToday && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}
                      className="border-slate-700 h-8 text-xs"
                    >
                      Ma
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* History or Today stat cards */}
          {historyStats && !isToday ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4">
              <Card className="glass-card border-orange-500/30">
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs text-orange-400">{format(new Date(selectedDate), "yyyy. MMM d.", { locale: hu })}</p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Elkészült autók</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{historyStats.cars_completed || 0}</p>
                </CardContent>
              </Card>
              <Card className="glass-card border-orange-500/30">
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs text-orange-400">Készpénz</p>
                  <p className="text-base sm:text-xl font-bold text-green-400">{(historyStats.cash_revenue || 0).toLocaleString()}<span className="text-xs"> Ft</span></p>
                </CardContent>
              </Card>
              <Card className="glass-card border-orange-500/30">
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs text-orange-400">Kártya</p>
                  <p className="text-base sm:text-xl font-bold text-blue-400">{(historyStats.card_revenue || 0).toLocaleString()}<span className="text-xs"> Ft</span></p>
                </CardContent>
              </Card>
              <Card className="glass-card border-orange-500/30">
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs text-orange-400">Átutalás</p>
                  <p className="text-base sm:text-xl font-bold text-purple-300">{(historyStats.transfer_revenue || 0).toLocaleString()}<span className="text-xs"> Ft</span></p>
                </CardContent>
              </Card>
              <Card className="glass-card border-orange-500/30">
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs text-orange-400">Összesen</p>
                  <p className="text-base sm:text-xl font-bold text-purple-400">{(historyStats.total_revenue || 0).toLocaleString()}<span className="text-xs"> Ft</span></p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
              <Card className="glass-card">
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs text-slate-400">Mai autók</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{dashboardStats.today_cars}</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs text-slate-400">Mai szolgáltatások</p>
                  <p className="text-xl sm:text-2xl font-bold text-cyan-300">{dashboardStats.today_services || 0}</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs text-slate-400">Mai készpénz</p>
                  <p className="text-base sm:text-xl font-bold text-green-400">{(dashboardStats.today_cash || 0).toLocaleString()}<span className="text-xs"> Ft</span></p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs text-slate-400">Mai kártya</p>
                  <p className="text-base sm:text-xl font-bold text-blue-400">{(dashboardStats.today_card || 0).toLocaleString()}<span className="text-xs"> Ft</span></p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs text-slate-400">Mai átutalás</p>
                  <p className="text-base sm:text-xl font-bold text-purple-300">{(dashboardStats.today_transfer || 0).toLocaleString()}<span className="text-xs"> Ft</span></p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs text-slate-400">Havi autók</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{dashboardStats.month_cars}</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs text-slate-400">Havi szolgáltatások</p>
                  <p className="text-xl sm:text-2xl font-bold text-cyan-300">{dashboardStats.month_services || 0}</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs text-slate-400">Havi készpénz</p>
                  <p className="text-base sm:text-xl font-bold text-green-400">{(dashboardStats.month_cash || 0).toLocaleString()}<span className="text-xs"> Ft</span></p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs text-slate-400">Havi kártya</p>
                  <p className="text-base sm:text-xl font-bold text-blue-400">{(dashboardStats.month_card || 0).toLocaleString()}<span className="text-xs"> Ft</span></p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs text-slate-400">Havi átutalás</p>
                  <p className="text-base sm:text-xl font-bold text-purple-300">{(dashboardStats.month_transfer || 0).toLocaleString()}<span className="text-xs"> Ft</span></p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── Section 3: Teljesítmény mutatók ── */}
      {advancedStats && (
        <>
          <div className="mt-6">
            <SectionDivider icon="📈" label="Teljesítmény mutatók" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <Card className="glass-card" data-testid="avg-revenue-card">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-400">Átl. bevétel / autó</p>
                    <p className="text-lg sm:text-2xl font-bold text-white mt-1">{(advancedStats.avg_revenue_per_car || 0).toLocaleString()}<span className="text-xs sm:text-sm"> Ft</span></p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card" data-testid="returning-customers-card">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-400">Visszatérő ügyfelek</p>
                    <p className="text-lg sm:text-2xl font-bold text-white mt-1">{advancedStats.returning_customers}<span className="text-xs sm:text-sm text-slate-400"> / {advancedStats.total_customers}</span></p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-cyan-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Repeat className="w-5 h-5 text-cyan-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card" data-testid="month-cars-change-card">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-400">Autók vs. előző hónap</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-lg sm:text-2xl font-bold text-white">{advancedStats.month_comparison?.current_month?.cars || 0}</p>
                      {advancedStats.month_comparison?.cars_change_percent !== 0 && (
                        <span className={`flex items-center text-sm ${advancedStats.month_comparison?.cars_change_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {advancedStats.month_comparison?.cars_change_percent >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          {Math.abs(advancedStats.month_comparison?.cars_change_percent || 0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-violet-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card" data-testid="month-revenue-change-card">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-400">Bevétel vs. előző hónap</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-base sm:text-2xl font-bold text-white">{(advancedStats.month_comparison?.current_month?.revenue || 0).toLocaleString()}<span className="text-xs sm:text-sm"> Ft</span></p>
                      {advancedStats.month_comparison?.revenue_change_percent !== 0 && (
                        <span className={`flex items-center text-sm ${advancedStats.month_comparison?.revenue_change_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {advancedStats.month_comparison?.revenue_change_percent >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          {Math.abs(advancedStats.month_comparison?.revenue_change_percent || 0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ── Section 4: Bevételi trendek ── */}
      <div className="mt-6">
        <SectionDivider icon="📉" label="Bevételi trendek" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg text-white font-['Manrope'] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Havi bevétel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyStats.length === 0 ? (
              <div className="text-center py-8 text-slate-400">Nincs adat</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="month"
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip formatter={(v) => `${v.toLocaleString()} Ft`} />} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Bevétel" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Daily Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg text-white font-['Manrope'] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-400" />
              Napi autók (aktuális hónap)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyStats.length === 0 ? (
              <div className="text-center py-8 text-slate-400">Nincs adat</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickFormatter={(value) => format(new Date(value), 'MM/dd')}
                  />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} name="Autók" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Section 5: Csapatteljesítmény & Ügyfelek ── */}
      {advancedStats && (
        <>
          <div className="mt-6">
            <SectionDivider icon="👥" label="Csapatteljesítmény & Ügyfelek" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Worker Performance Chart */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg text-white font-['Manrope'] flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Dolgozói teljesítmény (havi)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {workerStats.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">Nincs adat</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={workerStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="worker_name"
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        width={70}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill="#a855f7" radius={[0, 4, 4, 0]} name="Autók" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Service Popularity Chart */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg text-white font-['Manrope'] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-400" />
                  Legnépszerűbb szolgáltatások
                </CardTitle>
              </CardHeader>
              <CardContent>
                {serviceStats.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">Nincs adat</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={serviceStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="service_name"
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 9 }}
                        width={80}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} name="Darab" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Employee Revenue List */}
            <Card className="glass-card" data-testid="employee-revenue-card">
              <CardHeader>
                <CardTitle className="text-lg text-white font-['Manrope'] flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Bevétel dolgozónként
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(advancedStats.employee_revenue || []).length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">Nincs adat</p>
                ) : (
                  <div className="space-y-3">
                    {advancedStats.employee_revenue.map((emp) => (
                      <div key={emp.worker_id} className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-medium">{emp.name}</p>
                          <p className="text-slate-500 text-xs">{emp.cars} autó</p>
                        </div>
                        <p className="text-green-400 font-semibold">{emp.revenue.toLocaleString()} Ft</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top 10 Customers */}
            <Card className="glass-card" data-testid="top-customers-card">
              <CardHeader>
                <CardTitle className="text-lg text-white font-['Manrope'] flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  TOP 10 ügyfél
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(advancedStats.top_customers || []).length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">Nincs adat</p>
                ) : (
                  <div className="space-y-2">
                    {advancedStats.top_customers.map((cust, idx) => (
                      <div key={cust.customer_id} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                          idx === 1 ? 'bg-slate-400/20 text-slate-300' :
                          idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-slate-800 text-slate-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{cust.name}</p>
                          <p className="text-slate-500 text-xs">{cust.jobs} alkalom</p>
                        </div>
                        <p className="text-green-400 font-semibold text-sm">{cust.total.toLocaleString()} Ft</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Strongest Days */}
            <Card className={`glass-card ${selectedLocation === "all" ? "md:col-span-2 lg:col-span-1" : "md:col-span-1"}`} data-testid="strongest-days-card">
              <CardHeader>
                <CardTitle className="text-lg text-white font-['Manrope'] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  Napok teljesítménye
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(advancedStats.day_performance || []).length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">Nincs elég adat</p>
                ) : (
                  <div className="space-y-2">
                    {[...advancedStats.day_performance].sort((a, b) => b.avg_revenue - a.avg_revenue).map((day, idx) => (
                      <div key={day.day} className={`flex items-center justify-between p-3 rounded-lg border ${
                        idx < 2 ? 'bg-green-500/10 border-green-500/20' :
                        idx >= 5 ? 'bg-red-500/10 border-red-500/20' :
                        'bg-slate-800/50 border-slate-700/50'
                      }`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            idx === 0 ? 'bg-green-500/30 text-green-400' :
                            idx === 1 ? 'bg-green-500/20 text-green-400' :
                            idx >= 5 ? 'bg-red-500/20 text-red-400' :
                            'bg-slate-800 text-slate-400'
                          }`}>{idx + 1}</span>
                          <div>
                            <p className="text-white font-medium">{day.name}</p>
                            <p className="text-slate-500 text-xs">Átl. {day.avg_cars} autó/nap</p>
                          </div>
                        </div>
                        <p className={`font-bold ${idx < 2 ? 'text-green-400' : idx >= 5 ? 'text-red-400' : 'text-white'}`}>
                          {day.avg_revenue?.toLocaleString()} Ft
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location Breakdown — only if all locations */}
            {selectedLocation === "all" && (
              <Card className="glass-card md:col-span-2 lg:col-span-3" data-testid="location-revenue-card">
                <CardHeader>
                  <CardTitle className="text-lg text-white font-['Manrope'] flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-green-400" />
                    Telephely bontás (havi)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {locationStats.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">Nincs adat</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={locationStats}
                            dataKey="count"
                            nameKey="location"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {locationStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-4">
                        {locationStats.map((loc, index) => (
                          <div key={loc.location} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                              <span className="text-white font-medium">{loc.location}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-white font-semibold">{loc.count} autó</p>
                              <p className="text-green-400 text-sm">{loc.revenue.toLocaleString()} Ft</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* ── Section 6: Bevételi előrejelzés ── */}
      {forecast && (
        <>
          <div className="mt-6">
            <SectionDivider icon="🔮" label="Bevételi előrejelzés" />
          </div>

          <Card className="glass-card border-purple-500/30 bg-purple-500/5">
            <CardContent className="p-4 sm:p-5 space-y-4">

              {/* Top row: predicted revenue + range */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-purple-400 font-semibold text-sm">AI Bevételi előrejelzés</p>
                    <p className="text-white text-lg font-bold">{forecast.next_month_name}</p>
                  </div>
                </div>
                <div className="text-center sm:text-right">
                  <p className="text-xs text-slate-400 mb-1">Várható bevétel</p>
                  <p className="text-3xl sm:text-4xl font-bold text-purple-400">
                    {forecast.predicted_revenue.toLocaleString()}
                    <span className="text-base font-normal text-slate-400 ml-1">Ft</span>
                  </p>
                  {(forecast.pessimistic_revenue != null || forecast.optimistic_revenue != null) && (
                    <p className="text-xs text-slate-500 mt-1">
                      {forecast.pessimistic_revenue != null && (
                        <span className="text-red-400">{forecast.pessimistic_revenue.toLocaleString()} Ft</span>
                      )}
                      <span className="mx-1 text-slate-600">–</span>
                      {forecast.optimistic_revenue != null && (
                        <span className="text-green-400">{forecast.optimistic_revenue.toLocaleString()} Ft</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {(forecast.pessimistic_revenue != null || forecast.optimistic_revenue != null) && (
                <div className="rounded-xl border border-purple-500/20 bg-slate-950/40 p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-xs text-slate-400">Előrejelzési tartomány (min - max)</p>
                    <p className="text-[11px] text-purple-300">Bizonytalanság: {forecastUncertaintyPct}%</p>
                  </div>
                  <div className="relative h-2 rounded-full bg-slate-800 overflow-visible">
                    <div
                      className="h-full bg-gradient-to-r from-red-500/60 via-purple-500/70 to-green-500/60 transition-all"
                      style={{ width: `${forecastUncertaintyPct}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-purple-100 bg-white shadow-sm group cursor-help"
                      style={{ left: `calc(${expectedMarkerPct}% - 4px)` }}
                    >
                      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[120%] whitespace-nowrap rounded-md border border-slate-700 bg-slate-900/95 px-2 py-1 text-[10px] text-slate-200 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                        Min: {forecastMin.toLocaleString()} Ft • Várható: {forecastExpected.toLocaleString()} Ft • Max: {forecastMax.toLocaleString()} Ft
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-red-300">
                      Min: {forecast.pessimistic_revenue != null ? `${forecast.pessimistic_revenue.toLocaleString()} Ft` : "—"}
                    </span>
                    <span className="text-purple-300 font-semibold">
                      Várható: {forecast.predicted_revenue?.toLocaleString()} Ft
                    </span>
                    <span className="text-green-300 text-right">
                      Max: {forecast.optimistic_revenue != null ? `${forecast.optimistic_revenue.toLocaleString()} Ft` : "—"}
                    </span>
                  </div>
                </div>
              )}

              {/* Middle row: 3 metric chips */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Confirmed next */}
                <div className="flex flex-col gap-1 bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                  <p className="text-[11px] text-green-400 font-semibold uppercase tracking-wide">Már foglalt</p>
                  <p className="text-white font-bold text-lg">
                    {forecast.confirmed_next_revenue != null
                      ? `${forecast.confirmed_next_revenue.toLocaleString()} Ft`
                      : "—"}
                  </p>
                  {forecast.confirmed_next_cars != null && (
                    <p className="text-green-300 text-xs">{forecast.confirmed_next_cars} autó</p>
                  )}
                </div>

                {/* Predicted cars */}
                <div className="flex flex-col gap-1 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                  <p className="text-[11px] text-blue-400 font-semibold uppercase tracking-wide">Várható autók</p>
                  <p className="text-white font-bold text-lg">{forecast.predicted_cars} db</p>
                  <p className="text-blue-300 text-xs">jövő hónapra</p>
                </div>

                {/* Current month pace */}
                <div className="flex flex-col gap-1 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  <p className="text-[11px] text-amber-400 font-semibold uppercase tracking-wide">Jelenlegi hónap ütem</p>
                  <p className="text-white font-bold text-lg">
                    {forecast.projected_current_revenue != null
                      ? `${forecast.projected_current_revenue.toLocaleString()} Ft`
                      : "—"}
                  </p>
                  <p className="text-amber-300 text-xs">Ha ez az ütem tart...</p>
                </div>
              </div>

              {/* Sparkline bars */}
              {forecast.history && forecast.history.length > 0 && (
                <div className="pt-3 border-t border-purple-500/20">
                  <p className="text-xs text-slate-500 mb-2">Utolsó 6 hónap + előrejelzés</p>
                  <div className="flex items-end gap-1 h-14">
                    {forecast.history.map((m) => {
                      const maxRev = Math.max(...forecast.history.map(h => h.revenue), forecast.predicted_revenue) || 1;
                      const heightPct = Math.max(8, (m.revenue / maxRev) * 100);
                      return (
                        <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-purple-500/40 rounded-t"
                            style={{ height: `${heightPct}%` }}
                            title={`${m.month}: ${m.revenue.toLocaleString()} Ft`}
                          />
                          <span className="text-[9px] text-slate-500 hidden sm:block">{m.month.slice(5)}</span>
                        </div>
                      );
                    })}
                    {/* Forecast bar */}
                    <div className="flex-1 flex flex-col items-center gap-1">
                      {(() => {
                        const maxRev = Math.max(...forecast.history.map(h => h.revenue), forecast.predicted_revenue) || 1;
                        const heightPct = Math.max(8, (forecast.predicted_revenue / maxRev) * 100);
                        return (
                          <>
                            <div
                              className="w-full bg-purple-400/70 rounded-t border-2 border-purple-400 border-dashed"
                              style={{ height: `${heightPct}%` }}
                              title={`Előrejelzés: ${forecast.predicted_revenue.toLocaleString()} Ft`}
                            />
                            <span className="text-[9px] text-purple-400 hidden sm:block font-bold">előr.</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Footer: confidence + trend + disclaimer */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-purple-500/10">
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${confidenceTone}`}>
                  Biztonság: {confidenceLabel} ({forecastConfidence}%)
                </span>
                {forecast.trend === "up" ? (
                  <span className="flex items-center gap-1 text-green-400 text-xs font-medium">
                    <ArrowUpRight className="w-3 h-3" /> Növekvő trend
                  </span>
                ) : forecast.trend === "down" ? (
                  <span className="flex items-center gap-1 text-red-400 text-xs font-medium">
                    <ArrowDownRight className="w-3 h-3" /> Csökkenő trend
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs">Stabil trend</span>
                )}
                <div className="w-full sm:w-52 ml-auto">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Bizonytalanság</span>
                    <span>Magabiztos</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-green-400"
                      style={{ width: `${forecastConfidence}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700/80 bg-slate-900/40 p-3 sm:p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-200">Mi alapján számol az AI?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
                  <p>• Utolsó 6 hónap bevételi trendje és szezonális mintái.</p>
                  <p>• Már rögzített jövő havi foglalások súlyozott hatása.</p>
                  <p>• Jelenlegi havi tempóból számolt kifutási becslés.</p>
                  <p>• Növekvő/csökkenő trend irányának korrekciója.</p>
                </div>
                <p className="text-xs text-slate-600 ml-auto">
                  * Az előrejelzés az utolsó 6 hónap adatain alapuló lineáris regresszió — tájékoztató jellegű.
                </p>
              </div>

            </CardContent>
          </Card>
        </>
      )}

    </div>
  );
};
