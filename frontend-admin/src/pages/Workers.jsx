import { useState, useEffect } from "react";
/* eslint-disable react-hooks/exhaustive-deps */
import axios from "axios";
import { API, useAuth, useLocation2 } from "../App";
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
  Download,
  Sparkles,
  Fuel
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
// jsPDF and autoTable are loaded dynamically inside generateWorkerPDF / generateAttendancePDF

export const Workers = () => {
  const { user } = useAuth();
  const { selectedLocation, locationForApi } = useLocation2();
  const [shifts, setShifts] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isNewShiftOpen, setIsNewShiftOpen] = useState(false);
  const [isNewWorkerOpen, setIsNewWorkerOpen] = useState(false);
  const [viewMode, setViewMode] = useState("workers");
  const [calendarView, setCalendarView] = useState("month");
  const [editingWorker, setEditingWorker] = useState(null);
  const [editWorkerForm, setEditWorkerForm] = useState(null);
  const [workerStats, setWorkerStats] = useState([]);
  const [statsMonth, setStatsMonth] = useState(format(new Date(), "yyyy-MM"));
  const [statsLocation, setStatsLocation] = useState("all");
  const [deleteShiftId, setDeleteShiftId] = useState(null);
  const [deleteWorkerId, setDeleteWorkerId] = useState(null);
  const [editingShift, setEditingShift] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [leaveStats, setLeaveStats] = useState([]);

  // Absence management state
  const [absences, setAbsences] = useState([]);
  const [absenceForm, setAbsenceForm] = useState({ worker_id: "", date: "", reason: "Hiányzás" });
  const [addingAbsence, setAddingAbsence] = useState(false);

  const generateWorkerPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    await import("jspdf-autotable");
    return new Promise((resolve) => {
      const monthLabel = format(new Date(statsMonth + "-01"), "yyyy. MMMM", { locale: hu });
      const totals = workerStats.reduce((acc, w) => ({
        days: acc.days + w.days_worked,
        hours: acc.hours + w.hours_worked,
        cars: acc.cars + w.cars_completed,
        services: acc.services + (w.services_completed || w.cars_completed),
        revenue: acc.revenue + w.revenue,
        cash: acc.cash + (w.cash || 0),
        card: acc.card + (w.card || 0),
      }), { days: 0, hours: 0, cars: 0, services: 0, revenue: 0, cash: 0, card: 0 });

      const workerRows = workerStats.map(w => `
        <tr>
          <td>${w.name}</td>
          <td>${w.location}</td>
          <td style="text-align:center">${w.days_worked}</td>
          <td style="text-align:center">${w.hours_worked} ó</td>
          <td style="text-align:center">${w.cars_completed}</td>
          <td style="text-align:center">${w.services_completed || w.cars_completed}</td>
          <td style="text-align:right">${(w.revenue || 0).toLocaleString('hu-HU')} Ft</td>
          <td style="text-align:right">${(w.cash || 0).toLocaleString('hu-HU')} Ft</td>
          <td style="text-align:right">${(w.card || 0).toLocaleString('hu-HU')} Ft</td>
        </tr>
      `).join("");

      const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1e293b; padding: 8px; width: 780px;">
          <div style="background: linear-gradient(135deg, #16a34a, #15803d); color: white; padding: 16px 20px; border-radius: 8px; margin-bottom: 16px;">
            <div style="font-size: 22px; font-weight: bold; letter-spacing: 1px;">X-CLEAN Autókozmetika</div>
            <div style="font-size: 14px; margin-top: 4px; opacity: 0.9;">Havi Dolgozói Riport — ${monthLabel}</div>
            <div style="font-size: 10px; margin-top: 2px; opacity: 0.7;">Generálva: ${new Date().toLocaleDateString('hu-HU')}</div>
          </div>

          <div style="display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
            ${[
              { label: 'Ledolgozott napok', value: totals.days + ' nap' },
              { label: 'Ledolgozott órák', value: totals.hours.toFixed(1) + ' óra' },
              { label: 'Elvégzett autók', value: totals.cars + ' db' },
              { label: 'Összes szolgáltatás', value: totals.services + ' db' },
              { label: 'Összes bevétel', value: totals.revenue.toLocaleString('hu-HU') + ' Ft' },
              { label: 'Ebből készpénz', value: totals.cash.toLocaleString('hu-HU') + ' Ft' },
              { label: 'Ebből kártya', value: totals.card.toLocaleString('hu-HU') + ' Ft' },
            ].map(s => `
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 12px; min-width: 100px; flex: 1;">
                <div style="font-size: 9px; color: #16a34a; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">${s.label}</div>
                <div style="font-size: 14px; font-weight: bold; color: #15803d; margin-top: 2px;">${s.value}</div>
              </div>
            `).join('')}
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="background: #1e293b; color: white;">
                <th style="padding: 7px 8px; text-align: left; border: 1px solid #334155;">Dolgozó</th>
                <th style="padding: 7px 8px; text-align: left; border: 1px solid #334155;">Telephely</th>
                <th style="padding: 7px 8px; text-align: center; border: 1px solid #334155;">Napok</th>
                <th style="padding: 7px 8px; text-align: center; border: 1px solid #334155;">Órák</th>
                <th style="padding: 7px 8px; text-align: center; border: 1px solid #334155;">Autók</th>
                <th style="padding: 7px 8px; text-align: center; border: 1px solid #334155;">Szolg.</th>
                <th style="padding: 7px 8px; text-align: right; border: 1px solid #334155;">Bevétel</th>
                <th style="padding: 7px 8px; text-align: right; border: 1px solid #334155;">Készpénz</th>
                <th style="padding: 7px 8px; text-align: right; border: 1px solid #334155;">Kártya</th>
              </tr>
            </thead>
            <tbody>
              ${workerRows}
              <tr style="background: #f0fdf4; font-weight: bold; border-top: 2px solid #16a34a;">
                <td colspan="2" style="padding: 7px 8px; border: 1px solid #bbf7d0;">ÖSSZESEN</td>
                <td style="padding: 7px 8px; text-align: center; border: 1px solid #bbf7d0;">${totals.days}</td>
                <td style="padding: 7px 8px; text-align: center; border: 1px solid #bbf7d0;">${totals.hours.toFixed(1)} ó</td>
                <td style="padding: 7px 8px; text-align: center; border: 1px solid #bbf7d0;">${totals.cars}</td>
                <td style="padding: 7px 8px; text-align: center; border: 1px solid #bbf7d0;">${totals.services}</td>
                <td style="padding: 7px 8px; text-align: right; border: 1px solid #bbf7d0;">${totals.revenue.toLocaleString('hu-HU')} Ft</td>
                <td style="padding: 7px 8px; text-align: right; border: 1px solid #bbf7d0;">${totals.cash.toLocaleString('hu-HU')} Ft</td>
                <td style="padding: 7px 8px; text-align: right; border: 1px solid #bbf7d0;">${totals.card.toLocaleString('hu-HU')} Ft</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 16px; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px;">
            X-CLEAN Autókozmetika | Debrecen, Vágóhíd u. 2. | Tel: 06 (20) 473 9638 | www.xclean.hu
          </div>
        </div>
      `;

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.innerHTML = html;
      document.body.appendChild(container);

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.html(container, {
        callback: (doc) => {
          document.body.removeChild(container);
          resolve(doc);
        },
        x: 5,
        y: 5,
        width: 287,
        windowWidth: 800,
      });
    });
  };

  const generateAttendancePDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    await import("jspdf-autotable");
    try {
      const res = await axios.get(`${API}/shifts/attendance-report?month=${statsMonth}`, { withCredentials: true });
      const report = res.data;
      const monthLabel = format(new Date(statsMonth + "-01"), "yyyy. MMMM", { locale: hu });

      const shiftTypeLabel = (t) => {
        if (t === "normal") return "Munka";
        if (t === "vacation") return "Szabadság";
        if (t === "day_off") return "Szabadnap";
        if (t === "sick_leave") return "Betegszabadság";
        if (t === "absence") return "Hiányzás";
        return t;
      };

      const shiftTypeColor = (t) => {
        if (t === "normal") return "#16a34a";
        if (t === "vacation") return "#2563eb";
        if (t === "day_off") return "#7c3aed";
        if (t === "sick_leave") return "#dc2626";
        if (t === "absence") return "#d97706";
        return "#64748b";
      };

      const dayNames = { Monday: "Hétfő", Tuesday: "Kedd", Wednesday: "Szerda", Thursday: "Csütörtök", Friday: "Péntek", Saturday: "Szombat", Sunday: "Vasárnap" };

      const workerSections = report.workers.map(worker => {
        const shiftRows = worker.shifts.map(s => `
          <tr>
            <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">${s.date}</td>
            <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">${dayNames[s.day_name] || s.day_name}</td>
            <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center;">${s.shift_type === 'normal' ? s.start_time : '–'}</td>
            <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center;">${s.shift_type === 'normal' ? s.end_time : '–'}</td>
            <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center;">${s.lunch || '–'}</td>
            <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center;">${s.shift_type === 'normal' ? s.hours + ' ó' : '–'}</td>
            <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center; color: ${shiftTypeColor(s.shift_type)}; font-weight: bold;">${shiftTypeLabel(s.shift_type)}</td>
          </tr>
        `).join('');

        return `
          <div style="margin-bottom: 24px; page-break-inside: avoid;">
            <div style="background: #1e293b; color: white; padding: 10px 14px; border-radius: 6px 6px 0 0; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 14px; font-weight: bold;">${worker.worker_name}</span>
              <span style="font-size: 11px; opacity: 0.8;">${monthLabel}</span>
            </div>
            <div style="display: flex; gap: 0; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 6px 6px; overflow: hidden;">
              ${[
                { label: 'Munkanapok', value: worker.normal_days + ' nap', color: '#16a34a' },
                { label: 'Ledolg. órák', value: worker.total_hours + ' óra', color: '#15803d' },
                { label: 'Szabadság', value: worker.vacation_days + ' nap', color: '#2563eb' },
                { label: 'Szabadnap', value: (worker.day_off_days || 0) + ' nap', color: '#7c3aed' },
                { label: 'Betegszabadság', value: worker.sick_days + ' nap', color: '#dc2626' },
                { label: 'Hiányzás', value: (worker.absence_days || 0) + ' nap', color: '#d97706' },
              ].map(s => `
                <div style="flex: 1; padding: 8px 10px; border-right: 1px solid #e2e8f0; background: #f8fafc;">
                  <div style="font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px;">${s.label}</div>
                  <div style="font-size: 15px; font-weight: bold; color: ${s.color}; margin-top: 2px;">${s.value}</div>
                </div>
              `).join('')}
            </div>

            ${worker.shifts.length > 0 ? `
            <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 8px;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: left;">Dátum</th>
                  <th style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: left;">Nap</th>
                  <th style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center;">Kezdés</th>
                  <th style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center;">Befejezés</th>
                  <th style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center;">Ebéd</th>
                  <th style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center;">Órák</th>
                  <th style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center;">Típus</th>
                </tr>
              </thead>
              <tbody>${shiftRows}</tbody>
            </table>` : '<p style="color: #94a3b8; font-size: 11px; margin-top: 8px; padding: 8px;">Nincs rögzített műszak ebben a hónapban.</p>'}

            <div style="margin-top: 16px; border-top: 1px dashed #cbd5e1; padding-top: 8px; display: flex; justify-content: space-between; font-size: 10px; color: #64748b;">
              <span>Dolgozó aláírása: _______________________________</span>
              <span>Vezető aláírása: _______________________________</span>
            </div>
          </div>
        `;
      }).join('<div style="page-break-after: always;"></div>');

      const fullHtml = `
        <div style="font-family: Arial, Helvetica, sans-serif; color: #1e293b; padding: 10px; width: 740px;">
          <div style="background: linear-gradient(135deg, #16a34a, #15803d); color: white; padding: 14px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 20px; font-weight: bold;">X-CLEAN Autókozmetika</div>
              <div style="font-size: 13px; margin-top: 3px; opacity: 0.9;">Jelenléti Ív — ${monthLabel}</div>
            </div>
            <div style="font-size: 10px; opacity: 0.75; text-align: right;">
              Generálva: ${new Date().toLocaleDateString('hu-HU')}<br/>
              Debrecen, Vágóhíd u. 2.
            </div>
          </div>
          ${workerSections}
          <div style="font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px;">
            X-CLEAN Autókozmetika | Tel: 06 (20) 473 9638 | rendeles@xclean.hu
          </div>
        </div>
      `;

      return new Promise((resolve) => {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.innerHTML = fullHtml;
        document.body.appendChild(container);

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        doc.html(container, {
          callback: (doc) => {
            document.body.removeChild(container);
            resolve(doc);
          },
          x: 5,
          y: 5,
          width: 200,
          windowWidth: 760,
        });
      });
    } catch (error) {
      toast.error("Hiba a jelenléti ív generálásakor");
      return null;
    }
  };

  const handleDownloadAttendancePDF = async () => {
    const doc = await generateAttendancePDF();
    if (doc) {
      savePDF(doc, `xclean_jelenleti_iv_${statsMonth}.pdf`);
    }
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

  const handleDownloadWorkerPDF = async () => {
    const doc = await generateWorkerPDF();
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
    location: locationForApi || "Debrecen",
    start_time: "",
    end_time: "",
    lunch_start: "",
    lunch_end: ""
  });

  const [newWorker, setNewWorker] = useState({
    name: "",
    phone: "",
    email: "",
    position: "",
    location: locationForApi || "Debrecen",
    fuel_eligible: false,
    travel_allowance_eligible: false,
    travel_allowance_amount: 0
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
      const locationParam = locationForApi ? `?location=${locationForApi}` : "";
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchData();
  }, [selectedLocation]);

  const fetchWorkerStats = async (loc) => {
    try {
      const locationParam = (loc && loc !== "all") ? `&location=${loc}` : "";
      const res = await axios.get(`${API}/stats/worker-monthly?month=${statsMonth}${locationParam}`, { withCredentials: true });
      setWorkerStats(res.data);
    } catch (error) {
      console.error("Error fetching worker stats:", error);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (viewMode === "stats") {
      fetchWorkerStats(statsLocation);
    }
    if (viewMode === "absences") {
      fetchAbsences();
    }
  }, [viewMode, statsMonth, statsLocation]);

  const fetchAbsences = async () => {
    try {
      const res = await axios.get(`${API}/workers/absences/all`, { withCredentials: true });
      setAbsences(res.data);
    } catch (e) {
      console.error("Absences fetch error:", e);
    }
  };

  const handleAddAbsence = async () => {
    if (!absenceForm.worker_id || !absenceForm.date) return;
    setAddingAbsence(true);
    try {
      await axios.post(`${API}/workers/${absenceForm.worker_id}/absences`, {
        date: absenceForm.date,
        reason: absenceForm.reason || "Hiányzás"
      }, { withCredentials: true });
      toast.success("Hiányzás rögzítve");
      setAbsenceForm({ worker_id: "", date: "", reason: "Hiányzás" });
      fetchAbsences();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba a rögzítés során");
    } finally {
      setAddingAbsence(false);
    }
  };

  const handleDeleteAbsence = async (workerId, absenceId) => {
    try {
      await axios.delete(`${API}/workers/${workerId}/absences/${absenceId}`, { withCredentials: true });
      toast.success("Hiányzás törölve");
      fetchAbsences();
    } catch (e) {
      toast.error("Hiba a törlés során");
    }
  };

  const handleCreateShift = async () => {
    try {
      await axios.post(`${API}/shifts`, newShift, { withCredentials: true });
      toast.success("Műszak sikeresen létrehozva!");
      setIsNewShiftOpen(false);
      setNewShift({ worker_id: "", location: locationForApi || "Debrecen", start_time: "", end_time: "", shift_type: "normal", lunch_start: "", lunch_end: "" });
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

  const handleEditShift = (shift) => {
    setEditingShift({
      shift_id: shift.shift_id,
      worker_id: shift.worker_id,
      location: shift.location,
      start_time: shift.start_time.slice(0, 16), // Format for datetime-local input
      end_time: shift.end_time.slice(0, 16),
      shift_type: shift.shift_type || "normal",
      lunch_start: shift.lunch_start || "",
      lunch_end: shift.lunch_end || ""
    });
  };

  const handleSaveShift = async () => {
    try {
      await axios.put(`${API}/shifts/${editingShift.shift_id}`, {
        worker_id: editingShift.worker_id,
        location: editingShift.location,
        start_time: editingShift.start_time,
        end_time: editingShift.end_time,
        shift_type: editingShift.shift_type || "normal",
        lunch_start: editingShift.lunch_start || null,
        lunch_end: editingShift.lunch_end || null
      }, { withCredentials: true });
      toast.success("Műszak frissítve!");
      setEditingShift(null);
      fetchData();
    } catch (error) {
      toast.error("Hiba a műszak mentésekor");
    }
  };

  const handleDayClick = (day) => {
    // Pre-fill new shift form with selected day
    const dateStr = format(day, "yyyy-MM-dd");
    setNewShift({
      worker_id: "",
      location: "Debrecen",
      start_time: `${dateStr}T08:00`,
      end_time: `${dateStr}T16:00`,
      shift_type: "normal",
      lunch_start: "12:00",
      lunch_end: "12:30"
    });
    setSelectedDay(day);
    setIsNewShiftOpen(true);
  };

  const handleCreateWorker = async () => {
    try {
      await axios.post(`${API}/workers`, newWorker, { withCredentials: true });
      toast.success("Dolgozó sikeresen hozzáadva!");
      setIsNewWorkerOpen(false);
      setNewWorker({ name: "", phone: "", email: "", position: "", location: locationForApi || "Debrecen", fuel_eligible: false, travel_allowance_eligible: false, travel_allowance_amount: 0 });
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
      location: worker.location,
      fuel_eligible: worker.fuel_eligible || false,
      travel_allowance_eligible: worker.travel_allowance_eligible || false,
      travel_allowance_amount: worker.travel_allowance_amount || 0,
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

  const getShiftTypeMeta = (shiftType) => {
    switch (shiftType) {
      case "normal":
        return { label: "Munka", card: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };
      case "vacation":
        return { label: "Szabadság", card: "bg-blue-500/20 text-blue-300 border-blue-500/40" };
      case "day_off":
        return { label: "Szabadnap", card: "bg-violet-500/20 text-violet-300 border-violet-500/40" };
      case "sick_leave":
        return { label: "Betegszab.", card: "bg-rose-500/20 text-rose-300 border-rose-500/40" };
      default:
        return { label: "Hiányzás", card: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
    }
  };

  const formatShiftDuration = (shift) => {
    if (!shift?.start_time || !shift?.end_time || shift.shift_type !== "normal") return getShiftTypeMeta(shift?.shift_type).label;
    try {
      const start = new Date(shift.start_time);
      const end = new Date(shift.end_time);
      const minutes = Math.max(0, Math.round((end - start) / 60000));
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return m === 0 ? `${h}ó` : `${h}ó ${m}p`;
    } catch {
      return `${format(new Date(shift.start_time), "HH:mm")} - ${format(new Date(shift.end_time), "HH:mm")}`;
    }
  };

  const parseTimeToMinutes = (timeValue) => {
    if (!timeValue || typeof timeValue !== "string" || !timeValue.includes(":")) return 0;
    const [h, m] = timeValue.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return 0;
    return h * 60 + m;
  };

  const getNetShiftSummary = (shift) => {
    if (!shift?.start_time || !shift?.end_time || shift.shift_type !== "normal") {
      return { range: getShiftTypeMeta(shift?.shift_type).label, net: "", lunch: "" };
    }

    try {
      const start = new Date(shift.start_time);
      const end = new Date(shift.end_time);
      const grossMinutes = Math.max(0, Math.round((end - start) / 60000));

      let lunchMinutes = 0;
      let lunchLabel = "";
      if (shift.lunch_start && shift.lunch_end) {
        const lunchStart = parseTimeToMinutes(shift.lunch_start);
        const lunchEnd = parseTimeToMinutes(shift.lunch_end);
        lunchMinutes = Math.max(0, lunchEnd - lunchStart);
        lunchLabel = `${shift.lunch_start}-${shift.lunch_end}`;
      }

      const netMinutes = Math.max(0, grossMinutes - lunchMinutes);
      const netH = Math.floor(netMinutes / 60);
      const netM = netMinutes % 60;
      const netLabel = netM === 0 ? `${netH}ó` : `${netH}ó ${netM}p`;

      return {
        range: `${format(start, "HH:mm")}-${format(end, "HH:mm")}`,
        net: `Nettó: ${netLabel}`,
        lunch: lunchLabel ? `Ebéd: ${lunchLabel}` : "Ebéd: nincs",
      };
    } catch {
      return {
        range: `${format(new Date(shift.start_time), "HH:mm")}-${format(new Date(shift.end_time), "HH:mm")}`,
        net: "",
        lunch: shift.lunch_start && shift.lunch_end ? `Ebéd: ${shift.lunch_start}-${shift.lunch_end}` : "Ebéd: nincs",
      };
    }
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
    <div className="space-y-4 sm:space-y-6" data-testid="workers-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Manrope']">Dolgozók</h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">Dolgozók és műszakok kezelése</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
            <MapPin className="w-4 h-4 text-green-400" />
            <span className="text-sm text-white">{selectedLocation === "all" ? "Összes" : selectedLocation}</span>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800 w-full sm:w-auto flex-wrap h-auto p-1">
          <TabsTrigger value="workers" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-xs sm:text-sm px-2 sm:px-3">
            <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Dolgozók</span>
            <span className="sm:hidden">Lista</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-xs sm:text-sm px-2 sm:px-3">
            <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Műszakbeosztás</span>
            <span className="sm:hidden">Műszak</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-xs sm:text-sm px-2 sm:px-3">
            <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Statisztika</span>
            <span className="sm:hidden">Stat</span>
          </TabsTrigger>
          <TabsTrigger value="absences" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 text-xs sm:text-sm px-2 sm:px-3">
            <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Hiányzások</span>
            <span className="sm:hidden">Hiányzás</span>
          </TabsTrigger>
        </TabsList>

        {/* Workers Tab */}
        <TabsContent value="workers" className="mt-4 sm:mt-6">
          <Card className="glass-card">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl text-white font-['Manrope']">Dolgozók listája</CardTitle>
              <Dialog open={isNewWorkerOpen} onOpenChange={setIsNewWorkerOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-500 w-full sm:w-auto" data-testid="new-worker-btn">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Új dolgozó
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
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
                              <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
                              <SelectItem value="Budapest" className="text-white">Budapest</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                        <Fuel className="w-4 h-4 text-amber-400" />
                        <div className="flex-1">
                          <Label className="text-slate-300 text-sm">Üzemanyag-térítésre jogosult</Label>
                          <p className="text-xs text-slate-500">Budapest telephely esetén jutalékszámításban megjelenik</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewWorker({...newWorker, fuel_eligible: !newWorker.fuel_eligible})}
                          className={`w-10 h-6 rounded-full transition-colors ${newWorker.fuel_eligible ? 'bg-amber-500' : 'bg-slate-700'}`}
                        >
                          <span className={`block w-4 h-4 bg-white rounded-full mx-auto transition-transform ${newWorker.fuel_eligible ? 'translate-x-2' : '-translate-x-2'}`} />
                        </button>
                      </div>
                      {/* Travel allowance fields — shown when travel_allowance_eligible is true */}
                      <div className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                        <Car className="w-4 h-4 text-green-400" />
                        <div className="flex-1">
                          <Label className="text-slate-300 text-sm">Bejárási költségtérítésre jogosult</Label>
                          <p className="text-xs text-slate-500">Beállítható fix napi összeg</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewWorker({...newWorker, travel_allowance_eligible: !newWorker.travel_allowance_eligible})}
                          className={`w-10 h-6 rounded-full transition-colors ${newWorker.travel_allowance_eligible ? 'bg-green-500' : 'bg-slate-700'}`}
                        >
                          <span className={`block w-4 h-4 bg-white rounded-full mx-auto transition-transform ${newWorker.travel_allowance_eligible ? 'translate-x-2' : '-translate-x-2'}`} />
                        </button>
                      </div>
                      {newWorker.travel_allowance_eligible && (
                        <div>
                          <Label className="text-slate-300">Bejárási díj összege (Ft/nap)</Label>
                          <Input
                            type="number"
                            value={newWorker.travel_allowance_amount}
                            onChange={(e) => setNewWorker({...newWorker, travel_allowance_amount: parseInt(e.target.value) || 0})}
                            className="bg-slate-950 border-slate-700 text-white"
                            placeholder="pl. 1500"
                          />
                        </div>
                      )}
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
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                                      <MapPin className="w-3 h-3 mr-1" />
                                      {worker.location}
                                    </Badge>
                                    {worker.fuel_eligible && (
                                      <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-xs">
                                        <Fuel className="w-3 h-3 mr-1" />⛽
                                      </Badge>
                                    )}
                                  </div>
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
                                  <div className="flex justify-end items-center gap-2">
                                    <button
                                      type="button"
                                      title="Üzemanyag-térítés"
                                      onClick={() => setEditWorkerForm({...editWorkerForm, fuel_eligible: !editWorkerForm.fuel_eligible})}
                                      className={`w-8 h-5 rounded-full transition-colors flex-shrink-0 ${editWorkerForm.fuel_eligible ? 'bg-amber-500' : 'bg-slate-700'}`}
                                    >
                                      <span className={`block w-3 h-3 bg-white rounded-full mx-auto transition-transform ${editWorkerForm.fuel_eligible ? 'translate-x-1.5' : '-translate-x-1.5'}`} />
                                    </button>
                                    {/* Travel allowance */}
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-400 text-xs">Bejárási díj:</span>
                                      <button
                                        type="button"
                                        onClick={() => setEditWorkerForm({...editWorkerForm, travel_allowance_eligible: !editWorkerForm.travel_allowance_eligible})}
                                        className={`w-8 h-5 rounded-full transition-colors flex-shrink-0 ${editWorkerForm.travel_allowance_eligible ? 'bg-green-500' : 'bg-slate-700'}`}
                                      >
                                        <span className={`block w-3 h-3 bg-white rounded-full mx-auto transition-transform ${editWorkerForm.travel_allowance_eligible ? 'translate-x-1.5' : '-translate-x-1.5'}`} />
                                      </button>
                                      {editWorkerForm.travel_allowance_eligible && (
                                        <Input
                                          type="number"
                                          value={editWorkerForm.travel_allowance_amount || 0}
                                          onChange={(e) => setEditWorkerForm({...editWorkerForm, travel_allowance_amount: parseInt(e.target.value) || 0})}
                                          className="bg-slate-950 border-slate-700 text-white h-7 text-xs w-24"
                                          placeholder="Ft/nap"
                                        />
                                      )}
                                    </div>
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
                <DialogContent className="bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
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
                          <SelectItem value="Budapest" className="text-white">Budapest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    
                    {/* Shift Type */}
                    <div>
                      <Label className="text-slate-300">Típus</Label>
                      <Select value={newShift.shift_type || "normal"} onValueChange={(v) => setNewShift({...newShift, shift_type: v})}>
                        <SelectTrigger className="bg-slate-950 border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                          <SelectItem value="normal" className="text-white">Munkanap</SelectItem>
                          <SelectItem value="vacation" className="text-yellow-400">Szabadság</SelectItem>
                          <SelectItem value="day_off" className="text-violet-400">Szabadnap</SelectItem>
                          <SelectItem value="sick_leave" className="text-red-400">Betegszabadság</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Lunch Break - only for normal shifts */}
                    {(newShift.shift_type === "normal" || !newShift.shift_type) && (
                      <div className="border-t border-slate-700 pt-4 mt-4">
                        <Label className="text-slate-300 flex items-center gap-2 mb-3">
                          <Clock className="w-4 h-4" />
                          Ebédszünet (opcionális)
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-slate-400 text-sm">Kezdete</Label>
                            <Input
                              type="time"
                              value={newShift.lunch_start || ""}
                              onChange={(e) => setNewShift({...newShift, lunch_start: e.target.value})}
                              className="bg-slate-950 border-slate-700 text-white"
                              placeholder="12:00"
                            />
                          </div>
                          <div>
                            <Label className="text-slate-400 text-sm">Vége</Label>
                            <Input
                              type="time"
                              value={newShift.lunch_end || ""}
                              onChange={(e) => setNewShift({...newShift, lunch_end: e.target.value})}
                              className="bg-slate-950 border-slate-700 text-white"
                              placeholder="12:30"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
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
                <Button variant="ghost" onClick={() => navigate('prev')} className="text-slate-400 hover:text-white px-2">
                  <ChevronLeft className="w-5 h-5" />
                  <span className="hidden sm:inline ml-1">{calendarView === "month" ? "Előző hónap" : "Előző hét"}</span>
                </Button>
                <h2 className="text-sm sm:text-lg font-semibold text-white text-center truncate px-1 min-w-0">
                  {calendarView === "month"
                    ? format(currentDate, 'yyyy. MMMM', { locale: hu })
                    : <>
                        <span className="hidden sm:inline">{format(weekStart, 'yyyy. MMMM d.', { locale: hu })} – {format(weekEnd, 'MMMM d.', { locale: hu })}</span>
                        <span className="sm:hidden">{format(weekStart, 'MMM d.', { locale: hu })} – {format(weekEnd, 'MMM d.', { locale: hu })}</span>
                      </>
                  }
                </h2>
                <Button variant="ghost" onClick={() => navigate('next')} className="text-slate-400 hover:text-white px-2">
                  <span className="hidden sm:inline mr-1">{calendarView === "month" ? "Következő hónap" : "Következő hét"}</span>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Calendar */}
          {calendarView === "month" && (
            <Card className="glass-card">
              <CardContent className="p-2 sm:p-4">
                {/* Desktop view */}
                <div className="hidden sm:block overflow-x-auto">
                  <div className="min-w-[560px]">
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
                          onClick={() => isCurrentMonth && handleDayClick(day)}
                          className={`min-h-[100px] p-2 rounded-lg border cursor-pointer transition-colors
                            ${isCurrentMonth ? 'bg-slate-900/50 border-slate-800 hover:border-green-500/50' : 'bg-slate-950/30 border-slate-900'}
                            ${isToday ? 'ring-2 ring-green-500/50' : ''}`}
                        >
                          <div className={`text-sm font-medium mb-1 ${isCurrentMonth ? (isToday ? 'text-green-400' : 'text-white') : 'text-slate-600'}`}>
                            {format(day, 'd')}
                          </div>
                          <div className="space-y-1">
                            {dayShifts.slice(0, 3).map((shift) => {
                              const typeMeta = getShiftTypeMeta(shift.shift_type);
                              const shiftSummary = getNetShiftSummary(shift);
                              return (
                                <div 
                                  key={shift.shift_id}
                                  onClick={(e) => { e.stopPropagation(); handleEditShift(shift); }}
                                  className={`${typeMeta.card} border text-[11px] p-1.5 rounded group relative hover:ring-1 hover:ring-white/30`}
                                  title={`${shift.worker_name} · ${typeMeta.label} · ${shiftSummary.range}${shiftSummary.net ? ` · ${shiftSummary.net}` : ""} · ${shiftSummary.lunch}`}
                                >
                                  <div className="font-medium truncate">{shift.worker_name}</div>
                                  <div className="text-[10px] opacity-90 truncate">{shiftSummary.range}</div>
                                  {shift.shift_type === "normal" && (
                                    <div className="text-[10px] opacity-80 truncate">{shiftSummary.net} · {shiftSummary.lunch}</div>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDeleteShiftId(shift.shift_id); }}
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
                  </div>
                </div>

                {/* Mobile view - day cards */}
                <div className="sm:hidden space-y-2">
                  {monthDays.filter(day => isSameMonth(day, currentDate)).map((day, idx) => {
                    const dayShifts = getShiftsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                      <div 
                        key={idx}
                        className={`rounded-lg border ${isToday ? 'border-green-500/50 bg-green-500/5' : 'border-slate-800 bg-slate-900/50'}`}
                      >
                        <div 
                          className="p-3 flex items-center justify-between cursor-pointer"
                          onClick={() => handleDayClick(day)}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${isToday ? 'text-green-400' : 'text-white'}`}>
                              {format(day, "EEEE", { locale: hu })}
                            </span>
                            <span className="text-slate-400">{format(day, "d", { locale: hu })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {dayShifts.length > 0 && (
                              <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                                {dayShifts.length} műszak
                              </Badge>
                            )}
                            <Plus className="w-4 h-4 text-green-400" />
                          </div>
                        </div>
                        {dayShifts.length > 0 && (
                          <div className="px-3 pb-3 space-y-1">
                            {dayShifts.map((shift) => {
                              const typeMeta = getShiftTypeMeta(shift.shift_type);
                              return (
                                <div 
                                  key={shift.shift_id}
                                  onClick={() => handleEditShift(shift)}
                                  className={`${typeMeta.card} border text-sm p-2 rounded flex items-center justify-between`}
                                >
                                  <div>
                                    <span className="font-medium">{shift.worker_name}</span>
                                    <span className="text-xs ml-2">
                                      {shift.shift_type === "normal"
                                        ? `${format(new Date(shift.start_time), 'HH:mm')} - ${format(new Date(shift.end_time), 'HH:mm')}`
                                        : typeMeta.label}
                                    </span>
                                    {shift.shift_type === "normal" && shift.lunch_start && (
                                      <span className="text-yellow-500 text-xs ml-2">Ebéd: {shift.lunch_start}-{shift.lunch_end}</span>
                                    )}
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDeleteShiftId(shift.shift_id); }}
                                    className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
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
                {/* Desktop view - table */}
                <div className="hidden md:block overflow-x-auto">
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
                                      (() => {
                                        const typeMeta = getShiftTypeMeta(shift.shift_type);
                                        return (
                                      <div 
                                        key={shift.shift_id}
                                        className={`${typeMeta.card} border text-xs p-1 rounded group`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span>{shift.shift_type === "normal" ? `${format(new Date(shift.start_time), 'HH:mm')}-${format(new Date(shift.end_time), 'HH:mm')}` : typeMeta.label}</span>
                                          <button onClick={() => setDeleteShiftId(shift.shift_id)} className="opacity-0 group-hover:opacity-100 ml-1">
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                        {shift.shift_type === "normal" && shift.lunch_start && shift.lunch_end && (
                                          <div className="text-yellow-300 text-[10px] mt-0.5 flex items-center gap-1">
                                            <span>Ebéd: {shift.lunch_start}-{shift.lunch_end}</span>
                                          </div>
                                        )}
                                      </div>
                                        );
                                      })()
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

                {/* Mobile view - day cards */}
                <div className="md:hidden p-3 space-y-3">
                  {weekDays.map((day) => {
                    const isToday = isSameDay(day, new Date());
                    const dayShifts = shifts.filter(s => isSameDay(new Date(s.start_time), day));
                    
                    return (
                      <div 
                        key={day.toString()}
                        className={`rounded-lg border ${isToday ? 'border-green-500/50 bg-green-500/5' : 'border-slate-800 bg-slate-900/50'}`}
                      >
                        {/* Day header */}
                        <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${isToday ? 'text-green-400' : 'text-white'}`}>
                              {format(day, "EEEE", { locale: hu })}
                            </span>
                            <span className="text-slate-400 text-sm">{format(day, "MMM d", { locale: hu })}</span>
                          </div>
                          {dayShifts.length > 0 && (
                            <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                              {dayShifts.length} műszak
                            </Badge>
                          )}
                        </div>
                        
                        {/* Day shifts */}
                        <div className="p-2 space-y-2">
                          {dayShifts.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-2">Nincs műszak</p>
                          ) : (
                            dayShifts.map(shift => {
                              const typeMeta = getShiftTypeMeta(shift.shift_type);
                              return (
                                <div 
                                  key={shift.shift_id}
                                  className={`${typeMeta.card} border rounded-lg p-2 flex items-center justify-between`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-8 rounded ${typeMeta.card.includes("emerald") ? "bg-emerald-500" : typeMeta.card.includes("blue") ? "bg-blue-500" : typeMeta.card.includes("violet") ? "bg-violet-500" : typeMeta.card.includes("rose") ? "bg-rose-500" : "bg-amber-500"}`} />
                                    <div>
                                      <p className="font-medium text-sm">{shift.worker_name}</p>
                                      <p className="text-xs opacity-80">
                                        {shift.shift_type === "normal" ? `${format(new Date(shift.start_time), 'HH:mm')} - ${format(new Date(shift.end_time), 'HH:mm')}` : typeMeta.label}
                                        {shift.shift_type === "normal" && shift.lunch_start && (
                                          <span className="text-yellow-500 ml-2">Ebéd: {shift.lunch_start}-{shift.lunch_end}</span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    onClick={() => setDeleteShiftId(shift.shift_id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-4">
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
              <span className="text-white font-semibold text-base sm:text-lg">
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
            <Select value={statsLocation} onValueChange={setStatsLocation}>
              <SelectTrigger className="w-full sm:w-40 bg-slate-950 border-slate-700 text-white">
                <MapPin className="w-4 h-4 mr-2 text-green-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="all" className="text-white">Összes telephely</SelectItem>
                <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
                <SelectItem value="Budapest" className="text-white">Budapest</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2 sm:ml-auto flex-wrap">
              <Button 
                onClick={handleDownloadWorkerPDF}
                className="bg-slate-800 hover:bg-slate-700 text-white"
                data-testid="download-worker-pdf-btn"
              >
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">PDF letöltés</span>
                <span className="sm:hidden">PDF</span>
              </Button>
              <Button 
                onClick={handleDownloadAttendancePDF}
                className="bg-green-600 hover:bg-green-500 text-white"
                data-testid="download-attendance-pdf-btn"
              >
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Jelenléti ív</span>
                <span className="sm:hidden">Jelenlét</span>
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Összes elkészült szolgáltatás</p>
                    <p className="text-2xl font-bold text-white mt-1" data-testid="total-services-completed">
                      {workerStats.reduce((sum, w) => sum + (w.services_completed || w.cars_completed), 0)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-blue-400" />
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
                        <TableHead className="text-slate-400 text-center">Autók</TableHead>
                        <TableHead className="text-slate-400 text-center">Szolgáltatások</TableHead>
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
                              <span className="text-green-400 font-semibold">{worker.cars_completed}</span>
                              <span className="text-slate-500 text-xs ml-1">db</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-blue-400 font-semibold">{worker.services_completed ?? worker.cars_completed}</span>
                              <span className="text-slate-500 text-xs ml-1">db</span>
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

          {/* Budapest Commission Section */}
          {workerStats.filter(w => w.location === "Budapest").length > 0 && (
            <Card className="glass-card border-amber-500/30">
              <CardHeader>
                <CardTitle className="text-lg text-white font-['Manrope'] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-400" />
                  Budapest – Jutalék elszámolás (31,5%)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workerStats.filter(w => w.location === "Budapest").map(worker => {
                    const commission = Math.round(worker.revenue * 0.315);
                    const hasFuel = worker.fuel_eligible === true;
                    let fuel = 0;
                    if (hasFuel) {
                      if (worker.revenue <= 500000) fuel = 40000;
                      else if (worker.revenue <= 700000) fuel = 60000;
                      else fuel = 80000;
                    }
                    const hasTravel = worker.travel_allowance_eligible === true && worker.travel_allowance_amount > 0;
                    const travelAllowance = hasTravel ? (worker.travel_allowance_amount * (worker.days_worked || 0)) : 0;
                    const total = commission + fuel + travelAllowance;
                    return (
                      <div key={worker.worker_id} className="p-4 rounded-xl bg-slate-950/50 border border-slate-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-semibold text-base">{worker.name}</span>
                          <span className="text-xs text-slate-500">{worker.cars_completed} autó · {worker.services_completed ?? worker.cars_completed} szolgáltatás</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                            <p className="text-slate-500 text-xs mb-1">Bruttó bevétel</p>
                            <p className="text-white font-semibold">{worker.revenue.toLocaleString()} Ft</p>
                          </div>
                          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                            <p className="text-slate-500 text-xs mb-1">Készpénz</p>
                            <p className="text-green-400 font-semibold">{(worker.cash || 0).toLocaleString()} Ft</p>
                          </div>
                          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                            <p className="text-slate-500 text-xs mb-1">Kártya/Átutalás</p>
                            <p className="text-blue-400 font-semibold">{(worker.card || 0).toLocaleString()} Ft</p>
                          </div>
                          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-center">
                            <p className="text-amber-400 text-xs mb-1">Jutalék (31,5%)</p>
                            <p className="text-amber-400 font-bold">{commission.toLocaleString()} Ft</p>
                          </div>
                        </div>
                        {hasFuel && (
                          <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg border border-slate-700 text-sm">
                            <span className="text-slate-400 flex items-center gap-1"><Fuel className="w-3.5 h-3.5 text-amber-400" /> Üzemanyag-térítés</span>
                            <span className="text-white font-semibold">{fuel.toLocaleString()} Ft
                              <span className="text-slate-500 text-xs ml-2">({worker.revenue <= 500000 ? "≤500k" : worker.revenue <= 700000 ? "501-700k" : ">700k"} sáv)</span>
                            </span>
                          </div>
                        )}
                        {hasTravel && (
                          <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg border border-slate-700 text-sm">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Car className="w-3.5 h-3.5 text-green-400" /> Bejárási költségtérítés
                            </span>
                            <span className="text-white font-semibold">
                              {travelAllowance.toLocaleString()} Ft
                              <span className="text-slate-500 text-xs ml-2">({worker.days_worked || 0} nap × {worker.travel_allowance_amount?.toLocaleString()} Ft)</span>
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-xl border border-amber-500/30">
                          <span className="text-amber-300 font-medium">Összesen fizetendő</span>
                          <span className="text-amber-400 text-xl font-bold">{total.toLocaleString()} Ft</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Absence Management Tab */}
        <TabsContent value="absences" className="mt-6 space-y-6">
          {/* Add absence form */}
          <Card className="bg-slate-900/80 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <X className="w-4 h-4 text-red-400" />
                Hiányzás rögzítése
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                <div>
                  <Label className="text-slate-400 text-sm mb-1 block">Dolgozó</Label>
                  <Select value={absenceForm.worker_id} onValueChange={(v) => setAbsenceForm({...absenceForm, worker_id: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                      <SelectValue placeholder="Válassz..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {workers.map(w => (
                        <SelectItem key={w.worker_id} value={w.worker_id} className="text-white">
                          {w.name} <span className="text-slate-500 text-xs ml-1">({w.location})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-400 text-sm mb-1 block">Dátum</Label>
                  <Input
                    type="date"
                    value={absenceForm.date}
                    onChange={(e) => setAbsenceForm({...absenceForm, date: e.target.value})}
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-400 text-sm mb-1 block">Ok</Label>
                  <Select value={absenceForm.reason} onValueChange={(v) => setAbsenceForm({...absenceForm, reason: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="Hiányzás" className="text-white">Hiányzás</SelectItem>
                      <SelectItem value="Betegszabadság" className="text-red-400">Betegszabadság</SelectItem>
                      <SelectItem value="Szabadság" className="text-yellow-400">Szabadság</SelectItem>
                      <SelectItem value="Egyéb" className="text-slate-400">Egyéb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAddAbsence}
                  disabled={!absenceForm.worker_id || !absenceForm.date || addingAbsence}
                  className="bg-red-600 hover:bg-red-500 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Rögzítés
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Absences list grouped by worker */}
          {absences.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nincsenek rögzített hiányzások</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Group by worker */}
              {workers
                .filter(w => absences.some(a => a.worker_id === w.worker_id))
                .map(worker => {
                  const workerAbsences = absences
                    .filter(a => a.worker_id === worker.worker_id)
                    .sort((a, b) => b.date.localeCompare(a.date));
                  return (
                    <Card key={worker.worker_id} className="bg-slate-900/60 border-slate-800">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-400" />
                            <span className="text-white font-medium">{worker.name}</span>
                            <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                              <MapPin className="w-3 h-3 mr-1" />{worker.location}
                            </Badge>
                          </div>
                          <Badge className="bg-red-500/20 text-red-400 text-xs">
                            {workerAbsences.length} hiányzás
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {workerAbsences.map(abs => (
                            <div
                              key={abs.absence_id}
                              className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5 text-sm"
                            >
                              <span className="text-white">{abs.date}</span>
                              <span className={`text-xs ${
                                abs.reason === "Betegszabadság" ? "text-red-400" :
                                abs.reason === "Szabadság" ? "text-yellow-400" :
                                "text-slate-400"
                              }`}>{abs.reason}</span>
                              <button
                                onClick={() => handleDeleteAbsence(worker.worker_id, abs.absence_id)}
                                className="text-slate-600 hover:text-red-400 transition-colors"
                                title="Törlés"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Shift Confirmation Dialog */}
      <Dialog open={!!deleteShiftId} onOpenChange={() => setDeleteShiftId(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Műszak törlése</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400">Biztosan törölni szeretnéd ezt a műszakot?</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteShiftId(null)} className="border-slate-700">
              Mégse
            </Button>
            <Button variant="destructive" onClick={() => handleDeleteShift(deleteShiftId)} className="bg-red-600 hover:bg-red-700">
              Törlés
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Worker Confirmation Dialog */}
      <Dialog open={!!deleteWorkerId} onOpenChange={() => setDeleteWorkerId(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Dolgozó törlése</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400">Biztosan törölni szeretnéd ezt a dolgozót?</p>
          <p className="text-white font-medium">{workers.find(w => w.worker_id === deleteWorkerId)?.name}</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteWorkerId(null)} className="border-slate-700">
              Mégse
            </Button>
            <Button variant="destructive" onClick={() => handleDeleteWorker(deleteWorkerId)} className="bg-red-600 hover:bg-red-700">
              Törlés
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Shift Dialog */}
      <Dialog open={!!editingShift} onOpenChange={() => setEditingShift(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-400">
              <CalendarDays className="w-5 h-5" />
              Műszak szerkesztése
            </DialogTitle>
          </DialogHeader>
          {editingShift && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Dolgozó</label>
                <Select value={editingShift.worker_id} onValueChange={(v) => setEditingShift({ ...editingShift, worker_id: v })}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                    <SelectValue placeholder="Válassz dolgozót" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {workers.map((w) => (
                      <SelectItem key={w.worker_id} value={w.worker_id} className="text-white">{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Telephely</label>
                <Select value={editingShift.location} onValueChange={(v) => setEditingShift({ ...editingShift, location: v })}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Műszak kezdete</label>
                  <Input
                    type="datetime-local"
                    value={editingShift.start_time}
                    onChange={(e) => setEditingShift({ ...editingShift, start_time: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Műszak vége</label>
                  <Input
                    type="datetime-local"
                    value={editingShift.end_time}
                    onChange={(e) => setEditingShift({ ...editingShift, end_time: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Típus</label>
                <Select value={editingShift.shift_type || "normal"} onValueChange={(v) => setEditingShift({ ...editingShift, shift_type: v })}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="normal" className="text-white">Munkanap</SelectItem>
                    <SelectItem value="vacation" className="text-yellow-400">Szabadság</SelectItem>
                    <SelectItem value="day_off" className="text-violet-400">Szabadnap</SelectItem>
                    <SelectItem value="sick_leave" className="text-red-400">Betegszabadság</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Ebédszünet kezdete</label>
                  <Input
                    type="time"
                    value={editingShift.lunch_start}
                    onChange={(e) => setEditingShift({ ...editingShift, lunch_start: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-white"
                    placeholder="12:00"
                    disabled={editingShift.shift_type !== "normal"}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Ebédszünet vége</label>
                  <Input
                    type="time"
                    value={editingShift.lunch_end}
                    onChange={(e) => setEditingShift({ ...editingShift, lunch_end: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-white"
                    placeholder="12:30"
                    disabled={editingShift.shift_type !== "normal"}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingShift(null)} className="border-slate-700">
                  Mégse
                </Button>
                <Button onClick={handleSaveShift} className="bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4 mr-1" /> Mentés
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
