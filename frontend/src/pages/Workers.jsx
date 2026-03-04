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
import { Calendar } from "../components/ui/calendar";
import { 
  CalendarDays, 
  Plus,
  User,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from "date-fns";
import { hu } from "date-fns/locale";

export const Workers = () => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [isNewShiftOpen, setIsNewShiftOpen] = useState(false);
  
  const [newShift, setNewShift] = useState({
    worker_id: "",
    location: "Budapest",
    start_time: "",
    end_time: ""
  });

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
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

  const getShiftsForDay = (day, workerId) => {
    return shifts.filter(shift => {
      const shiftStart = new Date(shift.start_time);
      return isSameDay(shiftStart, day) && shift.worker_id === workerId;
    });
  };

  const getJobsForDay = (day, workerId) => {
    return jobs.filter(job => {
      const jobDate = new Date(job.date);
      return isSameDay(jobDate, day) && job.worker_id === workerId;
    });
  };

  const getWorkerColor = (index) => {
    const colors = [
      "bg-green-500",
      "bg-blue-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-cyan-500"
    ];
    return colors[index % colors.length];
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

      {/* Week Navigation */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              className="text-slate-400 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Előző hét
            </Button>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white">
                {format(weekStart, 'yyyy. MMMM d.', { locale: hu })} - {format(weekEnd, 'MMMM d.', { locale: hu })}
              </h2>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              className="text-slate-400 hover:text-white"
            >
              Következő hét
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
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
                {workers.map((worker, workerIndex) => (
                  <tr key={worker.worker_id} className="border-b border-slate-800/50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getWorkerColor(workerIndex)}`} />
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
                                className={`${getWorkerColor(workerIndex)} text-white text-xs p-1 rounded`}
                              >
                                {format(new Date(shift.start_time), 'HH:mm')} - {format(new Date(shift.end_time), 'HH:mm')}
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
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {workers.map((worker, index) => (
          <div key={worker.worker_id} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${getWorkerColor(index)}`} />
            <span className="text-sm text-slate-400">{worker.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
