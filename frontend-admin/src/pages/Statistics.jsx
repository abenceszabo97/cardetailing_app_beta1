import { useState, useEffect } from "react";
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
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [historyStats, setHistoryStats] = useState(null);

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
        const cardTotal = jobs.filter(j => j.payment_method === 'kartya').reduce((sum, j) => sum + (j.price || 0), 0);
        
        setHistoryStats({
          date: date,
          cars_completed: jobs.length,
          cash_revenue: cashTotal,
          card_revenue: cardTotal,
          total_revenue: cashTotal + cardTotal
        });
      } catch (e) {
        setHistoryStats(null);
      }
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedLocation]);

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

  const generatePDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(34, 197, 94); // Green
    doc.text('X-CLEAN Statisztika', pageWidth / 2, 20, { align: 'center' });
    
    // Date and location
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generálva: ${format(new Date(), 'yyyy. MMMM d. HH:mm', { locale: hu })}`, pageWidth / 2, 30, { align: 'center' });
    doc.text(`Telephely: ${selectedLocation === 'all' ? 'Összes' : selectedLocation}`, pageWidth / 2, 37, { align: 'center' });
    
    let yPos = 50;
    
    // Summary KPIs
    if (dashboardStats) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Összesítés', 14, yPos);
      yPos += 10;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Mutató', 'Érték']],
        body: [
          ['Mai elkészült autók', dashboardStats.today_cars?.toString() || '0'],
          ['Mai készpénz bevétel', `${(dashboardStats.today_cash || 0).toLocaleString()} Ft`],
          ['Mai kártya bevétel', `${(dashboardStats.today_card || 0).toLocaleString()} Ft`],
          ['Havi elkészült autók', dashboardStats.month_cars?.toString() || '0'],
          ['Havi készpénz bevétel', `${(dashboardStats.month_cash || 0).toLocaleString()} Ft`],
          ['Havi kártya bevétel', `${(dashboardStats.month_card || 0).toLocaleString()} Ft`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
        styles: { fontSize: 10 }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
    }
    
    // Daily stats table
    if (dailyStats.length > 0) {
      doc.setFontSize(14);
      doc.text('Napi statisztika (aktuális hónap)', 14, yPos);
      yPos += 10;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Dátum', 'Autók száma', 'Bevétel']],
        body: dailyStats.map(d => [
          format(new Date(d.date), 'yyyy.MM.dd'),
          d.count.toString(),
          `${d.revenue.toLocaleString()} Ft`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
        styles: { fontSize: 9 }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
    }
    
    // Check if we need a new page
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    
    // Worker stats
    if (workerStats.length > 0) {
      doc.setFontSize(14);
      doc.text('Dolgozói teljesítmény (havi)', 14, yPos);
      yPos += 10;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Dolgozó', 'Autók száma', 'Bevétel']],
        body: workerStats.map(w => [
          w.worker_name,
          w.count.toString(),
          `${w.revenue.toLocaleString()} Ft`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 10 }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
    }
    
    // Check if we need a new page
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    
    // Service stats
    if (serviceStats.length > 0) {
      doc.setFontSize(14);
      doc.text('Legnépszerűbb szolgáltatások', 14, yPos);
      yPos += 10;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Szolgáltatás', 'Darab', 'Bevétel']],
        body: serviceStats.map(s => [
          s.service_name,
          s.count.toString(),
          `${s.revenue.toLocaleString()} Ft`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [249, 115, 22] },
        styles: { fontSize: 9 }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
    }
    
    // Check if we need a new page
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }
    
    // Location stats - only Debrecen
    const filteredLocationStats = locationStats.filter(l => l.location === 'Debrecen');
    if (filteredLocationStats.length > 0) {
      doc.setFontSize(14);
      doc.text('Telephely bontás (havi)', 14, yPos);
      yPos += 10;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Telephely', 'Autók száma', 'Bevétel']],
        body: filteredLocationStats.map(l => [
          l.location,
          l.count.toString(),
          `${l.revenue.toLocaleString()} Ft`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [168, 85, 247] },
        styles: { fontSize: 10 }
      });
    }
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`X-CLEAN Menedzsment - Oldal ${i}/${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }
    
    // Save
    const fileName = `xclean_statisztika_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
    const blob = doc.output("blob");
    
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: "PDF dokumentum",
            accept: { "application/pdf": [".pdf"] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        toast.success('PDF mentve!');
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }
    
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    toast.success('PDF megnyitva új ablakban - mentsd el Ctrl+S-sel!');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
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

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="statistics-page">
      {/* Header */}
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
          
          <Button 
            onClick={generatePDF}
            className="bg-green-600 hover:bg-green-500 w-full sm:w-auto"
            data-testid="export-pdf-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {dashboardStats && (
        <>
          {/* Date Navigator for History */}
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

          {/* Show history stats if not today */}
          {historyStats && !isToday ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
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
                  <p className="text-[10px] sm:text-xs text-orange-400">Összesen</p>
                  <p className="text-base sm:text-xl font-bold text-purple-400">{(historyStats.total_revenue || 0).toLocaleString()}<span className="text-xs"> Ft</span></p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
              <Card className="glass-card">
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs text-slate-400">Mai autók</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{dashboardStats.today_cars}</p>
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
                  <p className="text-[10px] sm:text-xs text-slate-400">Havi autók</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{dashboardStats.month_cars}</p>
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
            </div>
          )}
        </>
      )}

      {/* Advanced Analytics */}
      {advancedStats && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
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
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Autók vs. előző hónap</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-2xl font-bold text-white">{advancedStats.month_comparison?.current_month?.cars || 0}</p>
                      {advancedStats.month_comparison?.cars_change_percent !== 0 && (
                        <span className={`flex items-center text-sm ${advancedStats.month_comparison?.cars_change_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {advancedStats.month_comparison?.cars_change_percent >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          {Math.abs(advancedStats.month_comparison?.cars_change_percent || 0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-violet-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card" data-testid="month-revenue-change-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Bevétel vs. előző hónap</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-2xl font-bold text-white">{(advancedStats.month_comparison?.current_month?.revenue || 0).toLocaleString()} Ft</p>
                      {advancedStats.month_comparison?.revenue_change_percent !== 0 && (
                        <span className={`flex items-center text-sm ${advancedStats.month_comparison?.revenue_change_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {advancedStats.month_comparison?.revenue_change_percent >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          {Math.abs(advancedStats.month_comparison?.revenue_change_percent || 0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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

            <Card className="glass-card" data-testid="location-revenue-card">
              <CardHeader>
                <CardTitle className="text-lg text-white font-['Manrope'] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-400" />
                  Bevétel telephelyenként
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(advancedStats.location_revenue || []).length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">Nincs adat</p>
                ) : (
                  <div className="space-y-3">
                    {advancedStats.location_revenue.map((loc) => (
                      <div key={loc.location} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-500" />
                          <div>
                            <p className="text-white text-sm font-medium">{loc.location}</p>
                            <p className="text-slate-500 text-xs">{loc.cars} autó</p>
                          </div>
                        </div>
                        <p className="text-green-400 font-semibold">{loc.revenue.toLocaleString()} Ft</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Strongest Days - All 7 days sorted */}
            <Card className="glass-card md:col-span-2 lg:col-span-2" data-testid="strongest-days-card">
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
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {/* Worker Performance */}
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

        {/* Service Popularity */}
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

        {/* Location Distribution */}
        <Card className="glass-card lg:col-span-2">
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
      </div>
    </div>
  );
};
