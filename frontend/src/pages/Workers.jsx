import { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { 
  CalendarDays, 
  Plus,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit,
  Save,
  X,
  Phone,
  Mail,
  UserPlus,
  Users,
  BarChart3,
  Car,
  Clock,
  Calendar,
  Download
} from "lucide-react";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth,
  endOfMonth,
  eachDayOfInterval, 
  addWeeks, 
  subWeeks, 
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth
} from "date-fns";
import { hu } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Workers = () => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [isNewShiftOpen, setIsNewShiftOpen] = useState(false);
  const [isNewWorkerOpen, setIsNewWorkerOpen] = useState(false);
  const [viewMode, setViewMode] = useState("workers");
  const [calendarView, setCalendarView] = useState("month");
  const [editingWorker, setEditingWorker] = useState(null);
  const [editWorkerForm, setEditWorkerForm] = useState(null);
  const [workerStats, setWorkerStats] = useState([]);
  const [statsMonth, setStatsMonth] = useState(format(new Date(), "yyyy-MM"));
  const [deleteShiftId, setDeleteShiftId] = useState(null);
  const [deleteWorkerId, setDeleteWorkerId] = useState(null);

  const generateWorkerPDF = () => {
    const doc = new jsPDF();
    const monthLabel = format(new Date(statsMonth + "-01"), "yyyy. MMMM", { locale: hu });
    
    doc.setFontSize(20);
    doc.text("X-CLEAN Dolgozoi Havi Riport", 14, 22);
    doc.setFontSize(12);
    doc.text(`Honap: ${monthLabel}`, 14, 32);
    
    const totals = workerStats.reduce((acc, w) => ({
      days: acc.days + w.days_worked,
      hours: acc.hours + w.hours_worked,
      cars: acc.cars + w.cars_completed,
      revenue: acc.revenue + w.revenue
    }), { days: 0, hours: 0, cars: 0, revenue: 0 });
    
    autoTable(doc, {
      startY: 40,
      head: [["Megnevezes", "Ertek"]],
      body: [
        ["Osszes ledolgozott nap", `${totals.days} nap`],
        ["Osszes ledolgozott ora", `${totals.hours.toFixed(1)} ora`],
        ["Osszes elkeszitett auto", `${totals.cars} db`],
        ["Osszes bevetel", `${totals.revenue.toLocaleString()} Ft`],
      ],
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59] },
    });
    
    if (workerStats.length > 0) {
      const finalY = doc.lastAutoTable?.finalY || 100;
      autoTable(doc, {
        startY: finalY + 14,
        head: [["Dolgozo", "Telephely", "Napok", "Orak", "Autok", "Bevetel"]],
        body: workerStats.map(w => [
          w.name,
          w.location,
          `${w.days_worked} nap`,
          `${w.hours_worked} ora`,
          `${w.cars_completed} db`,
          `${w.revenue.toLocaleString()} Ft`
        ]),
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59] },
      });
    }
    
    return doc;
  };

  const savePDF = async (doc, defaultFilename) => {
    const blob = doc.output("blob");
    
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultFilename,
          types: [{
            description: "PDF dokumentum",
            accept: { "application/pdf": [".pdf"] }
          }]
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
    toast.success("PDF megnyitva új ablakban - mentsd el Ctrl+S-sel!");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const handleDownloadWorkerPDF = () => {
    const doc = generateWorkerPDF();
    savePDF(doc, `xclean_dolgozoi_riport_${statsMonth}.pdf`);
  };

  const handleEmailWorkerPDF = async () => {
    const email = window.prompt("Add meg az email cimet:");
    if (!email) return;
    
    try {
      const monthLabel = format(new Date(statsMonth + "-01"), "yyyy. MMMM", { locale: hu });
      const totals = workerStats.reduce((acc, w) => ({
        days: acc.days + w.days_worked,
        hours: acc.hours + w.hours_worked,
        cars: acc.cars + w.cars_completed,
        revenue: acc.revenue + w.revenue
      }), { days: 0, hours: 0, cars: 0, revenue: 0 });
      
      let tableRows = workerStats.map(w => 
        `<tr><td>${w.name}</td><td>${w.location}</td><td>${w.days_worked} nap</td><td>${w.hours_worked} ora</td><td>${w.cars_completed} db</td><td>${w.revenue.toLocaleString()} Ft</td></tr>`
      ).join("");
      
      await axios.post(`${API}/send-email`, {
        recipient_email: email,
        subject: `X-CLEAN Dolgozoi Havi Riport - ${monthLabel}`,
        html_content: `<h2>X-CLEAN Dolgozoi Havi Riport</h2>
          <p><strong>Honap:</strong> ${monthLabel}</p>
          <p><strong>Osszes nap:</strong> ${totals.days} | <strong>Orak:</strong> ${totals.hours.toFixed(1)} | <strong>Autok:</strong> ${totals.cars} | <strong>Bevetel:</strong> ${totals.revenue.toLocaleString()} Ft</p>
          <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
            <tr style="background:#1e293b;color:white;"><th>Dolgozo</th><th>Telephely</th><th>Napok</th><th>Orak</th><th>Autok</th><th>Bevetel</th></tr>
            ${tableRows}
          </table>`
      }, { withCredentials: true });
      
      toast.success("Email sikeresen elkuldve!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Email kuldes sikertelen");
    }
  };
  
  const [newShift, setNewShift] = useState({
    worker_id: "",
    location: "Debrecen",
    start_time: "",
    end_time: ""
  });

  const [newWorker, setNewWorker] = useState({
    name: "",
    phone: "",
    email: "",
    position: "",
    location: "Budapest"
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const fetchData = async () => {
    try {
      const locationParam = selectedLocation !== "all" ? `?location=${selectedLocation}` : "";
      const [shiftsRes, workersRes, jobsRes] = await Promise.all([
        axios.get(`${API}/shifts${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/workers${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/jobs${locationParam}`, { withCredentials: true })
      ]);
      setShifts(shiftsRes.data);
      setWorkers(workersRes.data);
      setJobs(jobsRes.data);
    } catch (error) {
      toast.error("Hiba az adatok betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedLocation]);

  const fetchWorkerStats = async () => {
    try {
      const locationParam = selectedLocation !== "all" ? `&location=${selectedLocation}` : "";
      const res = await axios.get(`${API}/stats/worker-monthly?month=${statsMonth}${locationParam}`, { withCredentials: true });
      setWorkerStats(res.data);
    } catch (error) {
      console.error("Error fetching worker stats:", error);
    }
  };

  useEffect(() => {
    if (viewMode === "stats") {
      fetchWorkerStats();
    }
  }, [viewMode, statsMonth, selectedLocation]);

  const handleCreateShift = async () => {
    try {
      await axios.post(`${API}/shifts`, newShift, { withCredentials: true });
      toast.success("Műszak sikeresen létrehozva!");
      setIsNewShiftOpen(false);
      setNewShift({ worker_id: "", location: "Debrecen", start_time: "", end_time: "" });
      fetchData();
    } catch (error) {
      toast.error("Hiba a műszak létrehozásakor");
    }
  };

  const handleDeleteShift = async (shiftId) => {
    try {
      await axios.delete(`${API}/shifts/${shiftId}`, { withCredentials: true });
      toast.success("Műszak törölve!");
      fetchData();
      setDeleteShiftId(null);
    } catch (error) {
      toast.error("Hiba a műszak törlésekor");
    }
  };

  const handleCreateWorker = async () => {
    try {
      await axios.post(`${API}/workers`, newWorker, { withCredentials: true });
      toast.success("Dolgozó sikeresen hozzáadva!");
      setIsNewWorkerOpen(false);
      setNewWorker({ name: "", phone: "", email: "", position: "", location: "Debrecen" });
      fetchData();
    } catch (error) {
      toast.error("Hiba a dolgozó hozzáadásakor");
    }
  };

  const handleStartEditWorker = (worker) => {
    setEditingWorker(worker.worker_id);
    setEditWorkerForm({
      name: worker.name,
      phone: worker.phone || "",
      email: worker.email || "",
      position: worker.position || "",
      location: worker.location
    });
  };

  const handleSaveWorker = async (workerId) => {
    try {
      await axios.put(`${API}/workers/${workerId}`, editWorkerForm, { withCredentials: true });
      toast.success("Dolgozó adatai frissítve!");
      setEditingWorker(null);
      setEditWorkerForm(null);
      fetchData();
    } catch (error) {
      toast.error("Hiba a mentés során");
    }
  };

  const handleDeleteWorker = async (workerId) => {
    try {
      await axios.delete(`${API}/workers/${workerId}`, { withCredentials: true });
      toast.success("Dolgozó törölve!");
      fetchData();
      setDeleteWorkerId(null);
    } catch (error) {
      toast.error("Hiba a törlés során");
    }
  };

  const getShiftsForDay = (day, workerId = null) => {
    return shifts.filter(shift => {
      const shiftStart = new Date(shift.start_time);
      const matchesDay = isSameDay(shiftStart, day);
      const matchesWorker = workerId ? shift.worker_id === workerId : true;
      return matchesDay && matchesWorker;
    });
  };

  const getWorkerColor = (index) => {
    const colors = [
      { bg: "bg-green-500", text: "text-green-400", light: "bg-green-500/20" },
      { bg: "bg-blue-500", text: "text-blue-400", light: "bg-blue-500/20" },
      { bg: "bg-purple-500", text: "text-purple-400", light: "bg-purple-500/20" },
      { bg: "bg-orange-500", text: "text-orange-400", light: "bg-orange-500/20" },
      { bg: "bg-pink-500", text: "text-pink-400", light: "bg-pink-500/20" },
      { bg: "bg-cyan-500", text: "text-cyan-400", light: "bg-cyan-500/20" }
    ];
    if (index < 0 || index === undefined) return colors[0];
    return colors[index % colors.length];
  };

  const navigate = (direction) => {
    if (calendarView === "month") {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="workers-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Manrope']">Dolgozók</h1>
          <p className="text-slate-400 mt-1">Dolgozók és műszakok kezelése</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[150px] bg-slate-900 border-slate-700 text-white">
              <MapPin className="w-4 h-4 mr-2 text-green-400" />
              <SelectValue placeholder="Telephely" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all" className="text-white">Összes</SelectItem>
              <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="workers" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
            <Users className="w-4 h-4 mr-2" />
            Dolgozók
          </TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
            <CalendarDays className="w-4 h-4 mr-2" />
            Műszakbeosztás
          </TabsTrigger>
          <TabsTrigger value="stats" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
            <BarChart3 className="w-4 h-4 mr-2" />
            Statisztika
          </TabsTrigger>
        </TabsList>

        {/* Workers Tab */}
        <TabsContent value="workers" className="mt-6">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl text-white font-['Manrope']">Dolgozók listája</CardTitle>
              <Dialog open={isNewWorkerOpen} onOpenChange={setIsNewWorkerOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-500" data-testid="new-worker-btn">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Új dolgozó
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-slate-700 text-white">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-['Manrope']">Új dolgozó hozzáadása</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label className="text-slate-300">Név *</Label>
                        <Input
                          value={newWorker.name}
                          onChange={(e) => setNewWorker({...newWorker, name: e.target.value})}
                          className="bg-slate-950 border-slate-700 text-white"
                          placeholder="Teljes név"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-slate-300">Telefonszám</Label>
                          <Input
                            value={newWorker.phone}
                            onChange={(e) => setNewWorker({...newWorker, phone: e.target.value})}
                            className="bg-slate-950 border-slate-700 text-white"
                            placeholder="+36 30 123 4567"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300">Email</Label>
                          <Input
                            value={newWorker.email}
                            onChange={(e) => setNewWorker({...newWorker, email: e.target.value})}
                            className="bg-slate-950 border-slate-700 text-white"
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-slate-300">Beosztás</Label>
                          <Input
                            value={newWorker.position}
                            onChange={(e) => setNewWorker({...newWorker, position: e.target.value})}
                            className="bg-slate-950 border-slate-700 text-white"
                            placeholder="pl. Autómosó"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300">Telephely *</Label>
                          <Select value={newWorker.location} onValueChange={(v) => setNewWorker({...newWorker, location: v})}>
                            <SelectTrigger className="bg-slate-950 border-slate-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700">
                              <SelectItem value="Budapest" className="text-white">Budapest</SelectItem>
                              <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button 
                        onClick={handleCreateWorker}
                        className="w-full bg-green-600 hover:bg-green-500"
                        disabled={!newWorker.name}
                      >
                        Létrehozás
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
              {workers.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nincs dolgozó</p>
                </div>
              ) : (
                <>
                  {/* Mobile: Card Layout */}
                  <div className="md:hidden space-y-3">
                    {workers.map((worker, index) => {
                      const colors = getWorkerColor(index);
                      return (
                        <div key={worker.worker_id} className="p-4 bg-slate-950/50 rounded-lg border border-slate-800" data-testid={`worker-card-${worker.worker_id}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${colors.bg}`} />
                              <span className="text-white font-semibold">{worker.name}</span>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white"
                                onClick={() => handleStartEditWorker(worker)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-400"
                                onClick={() => setDeleteWorkerId(worker.worker_id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                            <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs">
                              <MapPin className="w-3 h-3 mr-1" />{worker.location}
                            </Badge>
                            {worker.position && <span>{worker.position}</span>}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 mt-2">
                            {worker.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{worker.phone}</span>}
                            {worker.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{worker.email}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop: Table Layout */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-800 hover:bg-transparent">
                          <TableHead className="text-slate-400">Név</TableHead>
                          <TableHead className="text-slate-400">Beosztás</TableHead>
                          <TableHead className="text-slate-400">Telephely</TableHead>
                          <TableHead className="text-slate-400">Elérhetőség</TableHead>
                          <TableHead className="text-slate-400 text-right">Műveletek</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workers.map((worker, index) => {
                          const colors = getWorkerColor(index);
                          const isEditing = editingWorker === worker.worker_id;
                          
                          return (
                            <TableRow key={worker.worker_id} className="border-slate-800 hover:bg-white/5">
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={editWorkerForm.name}
                                    onChange={(e) => setEditWorkerForm({...editWorkerForm, name: e.target.value})}
                                    className="w-40 bg-slate-950 border-slate-700 text-white"
                                  />
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${colors.bg}`} />
                                    <span className="text-white font-medium">{worker.name}</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={editWorkerForm.position}
                                    onChange={(e) => setEditWorkerForm({...editWorkerForm, position: e.target.value})}
                                    className="w-32 bg-slate-950 border-slate-700 text-white"
                                    placeholder="Beosztás"
                                  />
                                ) : (
                                  <span className="text-slate-300">{worker.position || "-"}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Select value={editWorkerForm.location} onValueChange={(v) => setEditWorkerForm({...editWorkerForm, location: v})}>
                                    <SelectTrigger className="w-32 bg-slate-950 border-slate-700">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-700">
                                      <SelectItem value="Budapest" className="text-white">Budapest</SelectItem>
                                      <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge variant="outline" className="border-slate-600 text-slate-300">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {worker.location}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <div className="space-y-1">
                                    <Input
                                      value={editWorkerForm.phone}
                                      onChange={(e) => setEditWorkerForm({...editWorkerForm, phone: e.target.value})}
                                      className="w-36 bg-slate-950 border-slate-700 text-white text-sm"
                                      placeholder="Telefon"
                                    />
                                    <Input
                                      value={editWorkerForm.email}
                                      onChange={(e) => setEditWorkerForm({...editWorkerForm, email: e.target.value})}
                                      className="w-36 bg-slate-950 border-slate-700 text-white text-sm"
                                      placeholder="Email"
                                    />
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    {worker.phone && (
                                      <div className="flex items-center gap-1 text-sm text-slate-400">
                                        <Phone className="w-3 h-3" />
                                        {worker.phone}
                                      </div>
                                    )}
                                    {worker.email && (
                                      <div className="flex items-center gap-1 text-sm text-slate-400">
                                        <Mail className="w-3 h-3" />
                                        {worker.email}
                                      </div>
                                    )}
                                    {!worker.phone && !worker.email && <span className="text-slate-500">-</span>}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {isEditing ? (
                                  <div className="flex justify-end gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-green-400 hover:text-green-300"
                                      onClick={() => handleSaveWorker(worker.worker_id)}
                                    >
                                      <Save className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-slate-400 hover:text-white"
                                      onClick={() => { setEditingWorker(null); setEditWorkerForm(null); }}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex justify-end gap-1">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-8 w-8 text-slate-400 hover:text-white"
                                          onClick={() => handleStartEditWorker(worker)}
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-8 w-8 text-slate-400 hover:text-red-400"
                                          onClick={() => handleDeleteWorker(worker.worker_id)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="mt-6 space-y-4">
          {/* Schedule Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Tabs value={calendarView} onValueChange={setCalendarView}>
              <TabsList className="bg-slate-900 border border-slate-800">
                <TabsTrigger value="week" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                  Heti
                </TabsTrigger>
                <TabsTrigger value="month" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                  Havi
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Dialog open={isNewShiftOpen} onOpenChange={setIsNewShiftOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-500" data-testid="new-shift-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Új műszak
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-700 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-['Manrope']">Új műszak létrehozása</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label className="text-slate-300">Dolgozó</Label>
                      <Select value={newShift.worker_id} onValueChange={(v) => setNewShift({...newShift, worker_id: v})}>
                        <SelectTrigger className="bg-slate-950 border-slate-700">
                          <SelectValue placeholder="Válassz dolgozót" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                          {workers.map(w => (
                            <SelectItem key={w.worker_id} value={w.worker_id} className="text-white">
                              {w.name} ({w.location})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Telephely</Label>
                      <Select value={newShift.location} onValueChange={(v) => setNewShift({...newShift, location: v})}>
                        <SelectTrigger className="bg-slate-950 border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                          <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-300">Kezdés</Label>
                        <Input
                          type="datetime-local"
                          value={newShift.start_time}
                          onChange={(e) => setNewShift({...newShift, start_time: e.target.value})}
                          className="bg-slate-950 border-slate-700 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Befejezés</Label>
                        <Input
                          type="datetime-local"
                          value={newShift.end_time}
                          onChange={(e) => setNewShift({...newShift, end_time: e.target.value})}
                          className="bg-slate-950 border-slate-700 text-white"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleCreateShift}
                      className="w-full bg-green-600 hover:bg-green-500"
                      disabled={!newShift.worker_id || !newShift.start_time || !newShift.end_time}
                    >
                      Létrehozás
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
          </div>

          {/* Navigation */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => navigate('prev')} className="text-slate-400 hover:text-white">
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  {calendarView === "month" ? "Előző hónap" : "Előző hét"}
                </Button>
                <h2 className="text-lg font-semibold text-white">
                  {calendarView === "month" 
                    ? format(currentDate, 'yyyy. MMMM', { locale: hu })
                    : `${format(weekStart, 'yyyy. MMMM d.', { locale: hu })} - ${format(weekEnd, 'MMMM d.', { locale: hu })}`
                  }
                </h2>
                <Button variant="ghost" onClick={() => navigate('next')} className="text-slate-400 hover:text-white">
                  {calendarView === "month" ? "Következő hónap" : "Következő hét"}
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Calendar */}
          {calendarView === "month" && (
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'].map((day, idx) => (
                    <div key={idx} className="text-center text-slate-400 text-sm font-medium py-2">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {monthDays.map((day, idx) => {
                    const dayShifts = getShiftsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    
                    return (
                      <div 
                        key={idx}
                        className={`min-h-[100px] p-2 rounded-lg border 
                          ${isCurrentMonth ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-950/30 border-slate-900'}
                          ${isToday ? 'ring-2 ring-green-500/50' : ''}`}
                      >
                        <div className={`text-sm font-medium mb-1 ${isCurrentMonth ? (isToday ? 'text-green-400' : 'text-white') : 'text-slate-600'}`}>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-1">
                          {dayShifts.slice(0, 3).map((shift) => {
                            const workerIndex = workers.findIndex(w => w.worker_id === shift.worker_id);
                            const colors = getWorkerColor(workerIndex);
                            return (
                              <div 
                                key={shift.shift_id}
                                className={`${colors.light} ${colors.text} text-xs p-1 rounded truncate group relative`}
                                title={`${shift.worker_name}: ${format(new Date(shift.start_time), 'HH:mm')} - ${format(new Date(shift.end_time), 'HH:mm')}`}
                              >
                                <span>{shift.worker_name?.split(' ')[0]}</span>
                                  <button
                                    onClick={() => setDeleteShiftId(shift.shift_id)}
                                    className="absolute right-0 top-0 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100"
                                  >
                                    <X className="w-2 h-2" />
                                  </button>
                              </div>
                            );
                          })}
                          {dayShifts.length > 3 && (
                            <div className="text-xs text-slate-500">+{dayShifts.length - 3}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weekly View */}
          {calendarView === "week" && (
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="p-4 text-left text-slate-400 font-medium w-40">Dolgozó</th>
                        {weekDays.map((day) => (
                          <th key={day.toString()} className="p-4 text-center text-slate-400 font-medium">
                            <div className="text-xs uppercase">{format(day, 'EEEEEE', { locale: hu })}</div>
                            <div className={`text-lg ${isSameDay(day, new Date()) ? 'text-green-400' : 'text-white'}`}>
                              {format(day, 'd')}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {workers.map((worker, workerIndex) => {
                        const colors = getWorkerColor(workerIndex);
                        return (
                          <tr key={worker.worker_id} className="border-b border-slate-800/50">
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${colors.bg}`} />
                                <span className="text-white font-medium">{worker.name}</span>
                              </div>
                              <span className="text-xs text-slate-500">{worker.location}</span>
                            </td>
                            {weekDays.map((day) => {
                              const dayShifts = getShiftsForDay(day, worker.worker_id);
                              return (
                                <td key={day.toString()} className="p-2 align-top">
                                  <div className="space-y-1">
                                    {dayShifts.map(shift => (
                                      <div 
                                        key={shift.shift_id}
                                        className={`${colors.bg} text-white text-xs p-1 rounded flex items-center justify-between group`}
                                      >
                                        <span>{format(new Date(shift.start_time), 'HH:mm')}-{format(new Date(shift.end_time), 'HH:mm')}</span>
                                          <button onClick={() => handleDeleteShift(shift.shift_id)} className="opacity-0 group-hover:opacity-100 ml-1">
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-4">
            {workers.map((worker, index) => {
              const colors = getWorkerColor(index);
              return (
                <div key={worker.worker_id} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${colors.bg}`} />
                  <span className="text-sm text-slate-400">{worker.name}</span>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="mt-6 space-y-4">
          {/* Month Selector */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={() => {
                  const d = new Date(statsMonth + "-01");
                  d.setMonth(d.getMonth() - 1);
                  setStatsMonth(format(d, "yyyy-MM"));
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-white font-semibold text-lg">
                {format(new Date(statsMonth + "-01"), "yyyy. MMMM", { locale: hu })}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={() => {
                  const d = new Date(statsMonth + "-01");
                  d.setMonth(d.getMonth() + 1);
                  setStatsMonth(format(d, "yyyy-MM"));
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button 
                onClick={handleDownloadWorkerPDF}
                className="bg-slate-800 hover:bg-slate-700 text-white"
                data-testid="download-worker-pdf-btn"
              >
                <Download className="w-4 h-4 mr-2" />
                PDF letöltés
              </Button>
              <Button 
                onClick={handleEmailWorkerPDF}
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                data-testid="email-worker-pdf-btn"
              >
                <Mail className="w-4 h-4 mr-2" />
                Küldés emailben
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Összes ledolgozott nap</p>
                    <p className="text-2xl font-bold text-white mt-1" data-testid="total-days-worked">
                      {workerStats.reduce((sum, w) => sum + w.days_worked, 0)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Összes ledolgozott óra</p>
                    <p className="text-2xl font-bold text-white mt-1" data-testid="total-hours-worked">
                      {workerStats.reduce((sum, w) => sum + w.hours_worked, 0).toFixed(1)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Összes elkészített autó</p>
                    <p className="text-2xl font-bold text-white mt-1" data-testid="total-cars-completed">
                      {workerStats.reduce((sum, w) => sum + w.cars_completed, 0)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <Car className="w-5 h-5 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Worker Stats Table */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg text-white font-['Manrope']">
                Dolgozói havi összesítő
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workerStats.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nincs adat a kiválasztott hónapban</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-400">Dolgozó</TableHead>
                        <TableHead className="text-slate-400">Telephely</TableHead>
                        <TableHead className="text-slate-400 text-center">Napok</TableHead>
                        <TableHead className="text-slate-400 text-center">Órák</TableHead>
                        <TableHead className="text-slate-400 text-center">Autók</TableHead>
                        <TableHead className="text-slate-400 text-right">Bevétel</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workerStats.map((worker, index) => {
                        const colors = getWorkerColor(index);
                        return (
                          <TableRow key={worker.worker_id} className="border-slate-800 hover:bg-white/5" data-testid={`worker-stat-row-${worker.worker_id}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${colors.bg}`} />
                                <span className="text-white font-medium">{worker.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-slate-600 text-slate-300">
                                <MapPin className="w-3 h-3 mr-1" />
                                {worker.location}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-white font-semibold">{worker.days_worked}</span>
                              <span className="text-slate-500 text-xs ml-1">nap</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-white font-semibold">{worker.hours_worked}</span>
                              <span className="text-slate-500 text-xs ml-1">óra</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-green-400 font-semibold">{worker.cars_completed}</span>
                              <span className="text-slate-500 text-xs ml-1">autó</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-green-400 font-semibold">{worker.revenue.toLocaleString()} Ft</span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
