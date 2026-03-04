import { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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
  CalendarDays, 
  Plus,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Trash2
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
  isSameMonth,
  getDay
} from "date-fns";
import { hu } from "date-fns/locale";

export const Workers = () => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [isNewShiftOpen, setIsNewShiftOpen] = useState(false);
  const [viewMode, setViewMode] = useState("month"); // week or month
  
  const [newShift, setNewShift] = useState({
    worker_id: "",
    location: "Budapest",
    start_time: "",
    end_time: ""
  });

  // Calculate dates based on view mode
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  
  // For month view, get all days including padding
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

  const handleCreateShift = async () => {
    try {
      await axios.post(`${API}/shifts`, newShift, { withCredentials: true });
      toast.success("Műszak sikeresen létrehozva!");
      setIsNewShiftOpen(false);
      setNewShift({ worker_id: "", location: "Budapest", start_time: "", end_time: "" });
      fetchData();
    } catch (error) {
      toast.error("Hiba a műszak létrehozásakor");
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!window.confirm("Biztosan törölni szeretnéd ezt a műszakot?")) return;
    try {
      await axios.delete(`${API}/shifts/${shiftId}`, { withCredentials: true });
      toast.success("Műszak törölve!");
      fetchData();
    } catch (error) {
      toast.error("Hiba a műszak törlésekor");
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

  const getJobsForDay = (day, workerId = null) => {
    return jobs.filter(job => {
      const jobDate = new Date(job.date);
      const matchesDay = isSameDay(jobDate, day);
      const matchesWorker = workerId ? job.worker_id === workerId : true;
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
    return colors[index % colors.length];
  };

  const navigate = (direction) => {
    if (viewMode === "month") {
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
          <h1 className="text-3xl font-bold text-white font-['Manrope']">Beosztás</h1>
          <p className="text-slate-400 mt-1">Dolgozók munkabeosztása</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[150px] bg-slate-900 border-slate-700 text-white">
              <MapPin className="w-4 h-4 mr-2 text-green-400" />
              <SelectValue placeholder="Telephely" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all" className="text-white">Összes</SelectItem>
              <SelectItem value="Budapest" className="text-white">Budapest</SelectItem>
              <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
            </SelectContent>
          </Select>
          
          {user?.role === "admin" && (
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
                            {w.name}
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
                        <SelectItem value="Budapest" className="text-white">Budapest</SelectItem>
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
          )}
        </div>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="week" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
            Heti nézet
          </TabsTrigger>
          <TabsTrigger value="month" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
            Havi nézet
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Navigation */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate('prev')}
              className="text-slate-400 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              {viewMode === "month" ? "Előző hónap" : "Előző hét"}
            </Button>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white">
                {viewMode === "month" 
                  ? format(currentDate, 'yyyy. MMMM', { locale: hu })
                  : `${format(weekStart, 'yyyy. MMMM d.', { locale: hu })} - ${format(weekEnd, 'MMMM d.', { locale: hu })}`
                }
              </h2>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => navigate('next')}
              className="text-slate-400 hover:text-white"
            >
              {viewMode === "month" ? "Következő hónap" : "Következő hét"}
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Calendar View */}
      {viewMode === "month" && (
        <Card className="glass-card">
          <CardContent className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'].map((day, idx) => (
                <div key={idx} className="text-center text-slate-400 text-sm font-medium py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((day, idx) => {
                const dayShifts = getShiftsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);
                
                return (
                  <div 
                    key={idx}
                    className={`
                      min-h-[100px] p-2 rounded-lg border 
                      ${isCurrentMonth ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-950/30 border-slate-900'}
                      ${isToday ? 'ring-2 ring-green-500/50' : ''}
                    `}
                  >
                    <div className={`text-sm font-medium mb-1 ${isCurrentMonth ? (isToday ? 'text-green-400' : 'text-white') : 'text-slate-600'}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayShifts.slice(0, 3).map((shift, shiftIdx) => {
                        const workerIndex = workers.findIndex(w => w.worker_id === shift.worker_id);
                        const colors = getWorkerColor(workerIndex);
                        return (
                          <div 
                            key={shift.shift_id}
                            className={`${colors.light} ${colors.text} text-xs p-1 rounded truncate`}
                            title={`${shift.worker_name}: ${format(new Date(shift.start_time), 'HH:mm')} - ${format(new Date(shift.end_time), 'HH:mm')}`}
                          >
                            {shift.worker_name?.split(' ')[0]}
                          </div>
                        );
                      })}
                      {dayShifts.length > 3 && (
                        <div className="text-xs text-slate-500">+{dayShifts.length - 3} további</div>
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
      {viewMode === "week" && (
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
                          const dayJobs = getJobsForDay(day, worker.worker_id);
                          
                          return (
                            <td key={day.toString()} className="p-2 align-top">
                              <div className="space-y-1">
                                {dayShifts.map(shift => (
                                  <div 
                                    key={shift.shift_id}
                                    className={`${colors.bg} text-white text-xs p-1 rounded flex items-center justify-between group`}
                                  >
                                    <span>{format(new Date(shift.start_time), 'HH:mm')} - {format(new Date(shift.end_time), 'HH:mm')}</span>
                                    {user?.role === "admin" && (
                                      <button
                                        onClick={() => handleDeleteShift(shift.shift_id)}
                                        className="opacity-0 group-hover:opacity-100 ml-1"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {dayJobs.map(job => (
                                  <div 
                                    key={job.job_id}
                                    className="bg-slate-700 text-slate-200 text-xs p-1 rounded truncate"
                                    title={`${job.plate_number} - ${job.service_name}`}
                                  >
                                    {job.plate_number}
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
    </div>
  );
};
