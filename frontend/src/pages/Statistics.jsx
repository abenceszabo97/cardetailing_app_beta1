import { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
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
  Download
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
import 'jspdf-autotable';

export const Statistics = () => {
  const { user } = useAuth();
  const [dailyStats, setDailyStats] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [workerStats, setWorkerStats] = useState([]);
  const [serviceStats, setServiceStats] = useState([]);
  const [locationStats, setLocationStats] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState("all");

  const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#ec4899', '#14b8a6'];

  const fetchStats = async () => {
    try {
      const locationParam = selectedLocation !== "all" ? `?location=${selectedLocation}` : "";
      const [dailyRes, monthlyRes, workerRes, serviceRes, locationRes, dashRes] = await Promise.all([
        axios.get(`${API}/stats/daily${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/stats/monthly${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/stats/workers${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/stats/services${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/stats/locations`, { withCredentials: true }),
        axios.get(`${API}/stats/dashboard${locationParam}`, { withCredentials: true })
      ]);
      setDailyStats(dailyRes.data);
      setMonthlyStats(monthlyRes.data);
      setWorkerStats(workerRes.data);
      setServiceStats(serviceRes.data.slice(0, 10));
      setLocationStats(locationRes.data);
      setDashboardStats(dashRes.data);
    } catch (error) {
      toast.error("Hiba a statisztikák betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedLocation]);

  const generatePDF = () => {
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
      
      doc.autoTable({
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
      
      doc.autoTable({
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
      
      doc.autoTable({
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
      
      doc.autoTable({
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
    
    // Location stats
    if (locationStats.length > 0) {
      doc.setFontSize(14);
      doc.text('Telephely bontás (havi)', 14, yPos);
      yPos += 10;
      
      doc.autoTable({
        startY: yPos,
        head: [['Telephely', 'Autók száma', 'Bevétel']],
        body: locationStats.map(l => [
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
    doc.save(fileName);
    toast.success('PDF sikeresen letöltve!');
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
    <div className="space-y-6" data-testid="statistics-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Manrope']">Statisztika</h1>
          <p className="text-slate-400 mt-1">Részletes kimutatások</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[180px] bg-slate-900 border-slate-700 text-white" data-testid="stats-location-select">
              <MapPin className="w-4 h-4 mr-2 text-green-400" />
              <SelectValue placeholder="Telephely" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all" className="text-white">Összes telephely</SelectItem>
              <SelectItem value="Budapest" className="text-white">Budapest</SelectItem>
              <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            onClick={generatePDF}
            className="bg-green-600 hover:bg-green-500"
            data-testid="export-pdf-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {dashboardStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400">Mai autók</p>
              <p className="text-2xl font-bold text-white">{dashboardStats.today_cars}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400">Mai készpénz</p>
              <p className="text-xl font-bold text-green-400">{(dashboardStats.today_cash || 0).toLocaleString()} Ft</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400">Mai kártya</p>
              <p className="text-xl font-bold text-blue-400">{(dashboardStats.today_card || 0).toLocaleString()} Ft</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400">Havi autók</p>
              <p className="text-2xl font-bold text-white">{dashboardStats.month_cars}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400">Havi készpénz</p>
              <p className="text-xl font-bold text-green-400">{(dashboardStats.month_cash || 0).toLocaleString()} Ft</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400">Havi kártya</p>
              <p className="text-xl font-bold text-blue-400">{(dashboardStats.month_card || 0).toLocaleString()} Ft</p>
            </CardContent>
          </Card>
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
                    width={100}
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
                    width={120}
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
