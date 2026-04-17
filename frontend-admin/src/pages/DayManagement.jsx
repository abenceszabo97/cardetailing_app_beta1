import { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth, useLocation2 } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
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
} from "../components/ui/dialog";
import { 
  Sun, 
  Moon, 
  MapPin,
  Banknote,
  Car,
  CreditCard,
  Wallet,
  CheckCircle2,
  Lock,
  Download,
  Mail
} from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const DayManagement = () => {
  const { user } = useAuth();
  const { selectedLocation, locationForApi } = useLocation2();
  const [dayLoc, setDayLoc] = useState(locationForApi || "Debrecen");
  const effectiveLoc = dayLoc;
  const [todayRecord, setTodayRecord] = useState(null);
  const [previousDayRecord, setPreviousDayRecord] = useState(null);
  const [stats, setStats] = useState({ today_cars: 0, today_revenue: 0, cash: 0, card: 0 });
  const [todayJobs, setTodayJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCloseDayConfirm, setShowCloseDayConfirm] = useState(false);
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("today"); // today or close
  
  const [openingBalance, setOpeningBalance] = useState("");
  const [closingBalance, setClosingBalance] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalReason, setWithdrawalReason] = useState("");

  const fetchData = async () => {
    try {
      const [recordRes, jobsRes, prevRecordRes] = await Promise.all([
        axios.get(`${API}/day-records/today?location=${effectiveLoc}`, { withCredentials: true }),
        axios.get(`${API}/jobs/today?location=${effectiveLoc}`, { withCredentials: true }),
        axios.get(`${API}/day-records?location=${effectiveLoc}`, { withCredentials: true })
      ]);
      
      setTodayRecord(recordRes.data);
      setTodayJobs(jobsRes.data);
      
      // Find the most recent closed day record for previous day balance
      const closedRecords = (prevRecordRes.data || []).filter(r => r.status === 'closed');
      if (closedRecords.length > 0) {
        setPreviousDayRecord(closedRecords[0]);
      }
      
      // Calculate stats from completed jobs
      const completedJobs = jobsRes.data.filter(j => j.status === "kesz");
      const cash = completedJobs.filter(j => j.payment_method === "keszpenz").reduce((sum, j) => sum + j.price, 0);
      const card = completedJobs.filter(j => j.payment_method === "kartya").reduce((sum, j) => sum + j.price, 0);
      
      setStats({
        today_cars: completedJobs.length,
        today_revenue: cash + card,
        cash,
        card
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTodayRecord(null);
    setPreviousDayRecord(null);
    setTodayJobs([]);
    setStats({ today_cars: 0, today_revenue: 0, cash: 0, card: 0 });
    setLoading(true);
    fetchData();
  }, [dayLoc]);

  const handleOpenDay = async () => {
    try {
      await axios.post(`${API}/day-records/open`, {
        location: dayLoc,
        opening_balance: parseFloat(openingBalance) || 0
      }, { withCredentials: true });
      
      toast.success("Nap sikeresen megnyitva!");
      setOpeningBalance("");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba a napnyitásnál");
    }
  };

  const handleCloseDay = async () => {
    const closingVal = parseFloat(closingBalance) || 0;
    try {
      const response = await axios.post(`${API}/day-records/close`, {
        location: dayLoc,
        closing_balance: closingVal,
        notes: closingNotes
      }, { withCredentials: true });
      
      const { discrepancy } = response.data;
      if (Math.abs(discrepancy) > 0) {
        toast.warning(`Nap lezárva! Kassza eltérés: ${discrepancy > 0 ? '+' : ''}${discrepancy.toLocaleString()} Ft`);
      } else {
        toast.success("Nap sikeresen lezárva! Kassza egyezik.");
      }
      
      setClosingNotes("");
      setClosingBalance("");
      setShowCloseDayConfirm(false);
      setActiveTab("today"); // Switch back to day opening tab
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba a napzárásnál");
    }
  };

  const handleWithdrawal = async () => {
    const amount = parseFloat(withdrawalAmount);
    if (!amount || amount <= 0) {
      toast.error("Érvényes összeget adj meg");
      return;
    }
    if (!withdrawalReason.trim()) {
      toast.error("Add meg a pénzelvitel okát");
      return;
    }
    
    try {
      await axios.post(`${API}/day-records/withdraw`, {
        location: dayLoc,
        amount,
        reason: withdrawalReason
      }, { withCredentials: true });
      
      toast.success(`Pénzelvitel rögzítve: ${amount.toLocaleString()} Ft`);
      setWithdrawalAmount("");
      setWithdrawalReason("");
      setShowWithdrawalDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba a pénzelvitelnél");
    }
  };

  const generateDayClosePDF = () => {
    const doc = new jsPDF();
    const today = format(new Date(), "yyyy. MMMM dd.", { locale: hu });
    const withdrawals = todayRecord?.withdrawals || [];
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const expectedClosing = (todayRecord?.opening_balance || 0) + stats.cash - totalWithdrawals;
    
    doc.setFontSize(20);
    doc.text("X-CLEAN Napi Zarasi Osszesito", 14, 22);
    doc.setFontSize(12);
    doc.text(`Datum: ${today}`, 14, 32);
    doc.text(`Telephely: ${dayLoc}`, 14, 40);
    
    doc.setFontSize(14);
    doc.text("Penzforgalom", 14, 54);
    
    autoTable(doc, {
      startY: 60,
      head: [["Megnevezes", "Ertek"]],
      body: [
        ["Nyito egyenleg", `${(todayRecord?.opening_balance || 0).toLocaleString()} Ft`],
        ["Keszpenz bevetel (+)", `+${stats.cash.toLocaleString()} Ft`],
        ["Keszpenz kivetelek (-)", `-${totalWithdrawals.toLocaleString()} Ft`],
        ["Varhato zaro egyenleg", `${expectedClosing.toLocaleString()} Ft`],
      ],
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 11 }
    });
    
    let currentY = doc.lastAutoTable?.finalY || 100;
    
    // Withdrawals detail
    if (withdrawals.length > 0) {
      currentY += 10;
      doc.setFontSize(14);
      doc.text("Keszpenz kivetelek reszletezese", 14, currentY);
      
      autoTable(doc, {
        startY: currentY + 6,
        head: [["Idopont", "Indoklas", "Szemely", "Osszeg"]],
        body: withdrawals.map(w => [
          format(new Date(w.timestamp), "HH:mm"),
          w.reason,
          w.withdrawn_by,
          `-${w.amount.toLocaleString()} Ft`
        ]),
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 10 }
      });
      currentY = doc.lastAutoTable?.finalY || currentY + 50;
    }
    
    // Daily summary
    currentY += 10;
    doc.setFontSize(14);
    doc.text("Napi osszesites", 14, currentY);
    
    autoTable(doc, {
      startY: currentY + 6,
      head: [["Megnevezes", "Ertek"]],
      body: [
        ["Elkeszult autok", `${stats.today_cars} db`],
        ["Osszes bevetel", `${stats.today_revenue.toLocaleString()} Ft`],
        ["Keszpenz bevetel", `${stats.cash.toLocaleString()} Ft`],
        ["Kartya bevetel", `${stats.card.toLocaleString()} Ft`],
      ],
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 11 }
    });
    currentY = doc.lastAutoTable?.finalY || currentY + 50;
    
    // Completed jobs
    const completedJobs = todayJobs.filter(j => j.status === "kesz");
    if (completedJobs.length > 0) {
      currentY += 10;
      doc.setFontSize(14);
      doc.text("Elkeszult munkak", 14, currentY);
      
      autoTable(doc, {
        startY: currentY + 6,
        head: [["Rendszam", "Szolgaltatas", "Dolgozo", "Fizetes", "Osszeg"]],
        body: completedJobs.map(j => [
          j.plate_number || "-",
          j.service_name || "-",
          j.worker_name || "-",
          j.payment_method === "keszpenz" ? "Keszpenz" : "Kartya",
          `${j.price.toLocaleString()} Ft`
        ]),
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 9 }
      });
    }
    
    // Cancelled/no-show jobs
    const cancelledJobs = todayJobs.filter(j => j.status === "nem_jott_el" || j.status === "lemondta");
    if (cancelledJobs.length > 0) {
      currentY = doc.lastAutoTable?.finalY || currentY + 50;
      currentY += 10;
      doc.setFontSize(14);
      doc.text("Lemondott / Nem jelent meg", 14, currentY);
      
      autoTable(doc, {
        startY: currentY + 6,
        head: [["Rendszam", "Szolgaltatas", "Statusz"]],
        body: cancelledJobs.map(j => [
          j.plate_number || "-",
          j.service_name || "-",
          j.status === "nem_jott_el" ? "Nem jelent meg" : "Lemondta"
        ]),
        theme: "grid",
        headStyles: { fillColor: [100, 50, 50] },
        styles: { fontSize: 9 }
      });
    }
    
    return doc;
  };

  const savePDF = async (doc, defaultFilename) => {
    const blob = doc.output("blob");
    
    // Try native "Save As" dialog first
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
        if (err.name === "AbortError") return; // User cancelled
      }
    }
    
    // Fallback: open in new tab
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    toast.success("PDF megnyitva új ablakban - mentsd el Ctrl+S-sel!");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const handleDownloadPDF = () => {
    const doc = generateDayClosePDF();
    const today = format(new Date(), "yyyy-MM-dd");
    savePDF(doc, `xclean_napzaras_${dayLoc}_${today}.pdf`);
  };

  const handleEmailPDF = async () => {
    const email = window.prompt("Add meg az email cimet:");
    if (!email) return;
    
    try {
      const doc = generateDayClosePDF();
      const today = format(new Date(), "yyyy. MMMM dd.", { locale: hu });
      const pdfContent = doc.output("datauristring");
      
      await axios.post(`${API}/send-email`, {
        recipient_email: email,
        subject: `X-CLEAN Napi zaras - ${dayLoc} - ${today}`,
        html_content: `<h2>X-CLEAN Napi Zarasi Osszesito</h2>
          <p><strong>Datum:</strong> ${today}</p>
          <p><strong>Telephely:</strong> ${dayLoc}</p>
          <p><strong>Elkeszult autok:</strong> ${stats.today_cars} db</p>
          <p><strong>Osszes bevetel:</strong> ${stats.today_revenue.toLocaleString()} Ft</p>
          <p><strong>Keszpenz:</strong> ${stats.cash.toLocaleString()} Ft</p>
          <p><strong>Kartya:</strong> ${stats.card.toLocaleString()} Ft</p>`
      }, { withCredentials: true });
      
      toast.success("Email sikeresen elkuldve!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Email kuldes sikertelen");
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
    <div className="space-y-4 sm:space-y-6" data-testid="day-management-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Manrope']">Napnyitás / Napzárás</h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">
            {format(new Date(), 'yyyy. MMMM d. EEEE', { locale: hu })}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-1">
          {["Debrecen", "Budapest"].map(loc => (
            <button
              key={loc}
              onClick={() => setDayLoc(loc)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                dayLoc === loc
                  ? "bg-green-500/20 text-green-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* Day Status Card */}
      <Card className={`glass-card ${todayRecord?.status === 'closed' ? 'border-green-500/30' : todayRecord ? 'border-orange-500/30' : 'border-red-500/30'}`}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            {todayRecord?.status === 'closed' ? (
              <>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                  <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-green-400 font-semibold text-sm sm:text-base">Nap lezárva</p>
                  <p className="text-slate-400 text-xs sm:text-sm">A mai nap le van zárva a(z) {dayLoc} telephelyen</p>
                </div>
              </>
            ) : todayRecord ? (
              <>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                  <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-orange-400 font-semibold text-sm sm:text-base">Nap nyitva</p>
                  <p className="text-slate-400 text-xs sm:text-sm">Nyitó egyenleg: {todayRecord.opening_balance.toLocaleString()} Ft</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                  <Moon className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-red-400 font-semibold text-sm sm:text-base">Nap nincs nyitva</p>
                  <p className="text-slate-400 text-xs sm:text-sm">Nyisd meg a napot a munkavégzés megkezdéséhez</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Open Day Form - show when no record OR day is closed */}
      {(!todayRecord || todayRecord?.status === "closed") && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-xl text-white font-['Manrope'] flex items-center gap-2">
              <Sun className="w-5 h-5 text-orange-400" />
              Napnyitás
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Previous day info */}
            {previousDayRecord && (
              <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-400 mb-2">Előző nap ({format(new Date(previousDayRecord.date), "MMM d.", { locale: hu })}) záró egyenlege:</p>
                {/* Show expected_closing as the carryover value (what should have been in the register) */}
                <p className="text-2xl font-bold text-green-400">
                  {(previousDayRecord.expected_closing || previousDayRecord.closing_balance || 0).toLocaleString()} Ft
                </p>
                {previousDayRecord.discrepancy !== 0 && (
                  <p className={`text-xs mt-1 ${previousDayRecord.discrepancy > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    Beírt záró egyenleg: {(previousDayRecord.closing_balance || 0).toLocaleString()} Ft
                    <span className="ml-2">
                      (Eltérés: {previousDayRecord.discrepancy > 0 ? '+' : ''}{previousDayRecord.discrepancy?.toLocaleString()} Ft)
                    </span>
                  </p>
                )}
              </div>
            )}
            <div>
              <Label className="text-slate-300">Nyitó egyenleg (Ft)</Label>
              <Input
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="bg-slate-950 border-slate-700 text-white"
                placeholder={previousDayRecord ? (previousDayRecord.expected_closing || previousDayRecord.closing_balance || 0).toString() : "0"}
                data-testid="opening-balance-input"
              />
              <p className="text-xs text-slate-500 mt-1">A kasszában lévő készpénz összege</p>
            </div>
            {previousDayRecord && !openingBalance && (
              <Button 
                variant="outline"
                onClick={() => setOpeningBalance((previousDayRecord.expected_closing || previousDayRecord.closing_balance || 0).toString())}
                className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Előző nap záró egyenlegének átvétele ({(previousDayRecord.expected_closing || previousDayRecord.closing_balance || 0).toLocaleString()} Ft)
              </Button>
            )}
            <Button 
              onClick={handleOpenDay}
              className="w-full bg-green-600 hover:bg-green-500"
              data-testid="open-day-btn"
            >
              <Sun className="w-4 h-4 mr-2" />
              Nap megnyitása
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Day Stats */}
      {todayRecord && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <Card className="glass-card">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-slate-400">Mai autók</p>
                    <p className="text-xl sm:text-3xl font-bold text-white mt-1">{stats.today_cars}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <Car className="w-4 h-4 sm:w-6 sm:h-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-slate-400">Mai bevétel</p>
                    <p className="text-lg sm:text-3xl font-bold text-white mt-1">{stats.today_revenue.toLocaleString()}<span className="text-xs sm:text-base"> Ft</span></p>
                  </div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Banknote className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-slate-400">Készpénz</p>
                    <p className="text-lg sm:text-3xl font-bold text-green-400 mt-1">{stats.cash.toLocaleString()}<span className="text-xs sm:text-base"> Ft</span></p>
                  </div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <Wallet className="w-4 h-4 sm:w-6 sm:h-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-slate-400">Kártya</p>
                    <p className="text-lg sm:text-3xl font-bold text-blue-400 mt-1">{stats.card.toLocaleString()}<span className="text-xs sm:text-base"> Ft</span></p>
                  </div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* PDF Export Buttons */}
          <div className="flex flex-wrap gap-2 sm:gap-3" data-testid="day-export-buttons">
            <Button 
              onClick={handleDownloadPDF}
              className="bg-slate-800 hover:bg-slate-700 text-white"
              data-testid="download-day-pdf-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF letöltés
            </Button>
            <Button 
              onClick={handleEmailPDF}
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              data-testid="email-day-pdf-btn"
            >
              <Mail className="w-4 h-4 mr-2" />
              Küldés emailben
            </Button>
          </div>

          {/* Today's Completed Jobs */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-xl text-white font-['Manrope']">Mai elkészült munkák</CardTitle>
            </CardHeader>
            <CardContent>
              {todayJobs.filter(j => j.status === "kesz").length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nincs még elkészült munka</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {todayJobs.filter(j => j.status === "kesz").map(job => (
                    <div 
                      key={job.job_id}
                      className="flex items-center justify-between p-3 bg-slate-950/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-white">{job.plate_number}</span>
                        <span className="text-slate-400">{job.service_name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {job.payment_method === "keszpenz" ? (
                          <Wallet className="w-4 h-4 text-green-400" />
                        ) : (
                          <CreditCard className="w-4 h-4 text-blue-400" />
                        )}
                        <span className="font-semibold text-green-400">{job.price.toLocaleString()} Ft</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Close Day Form */}
          {todayRecord.status !== 'closed' && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-xl text-white font-['Manrope'] flex items-center gap-2">
                  <Moon className="w-5 h-5 text-blue-400" />
                  Napzárás
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950/50 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-400">Nyitó egyenleg</p>
                    <p className="text-xl font-semibold text-white">{todayRecord.opening_balance.toLocaleString()} Ft</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Készpénz bevétel</p>
                    <p className="text-xl font-semibold text-green-400">+{stats.cash.toLocaleString()} Ft</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Készpénz kivételek</p>
                    <p className="text-xl font-semibold text-red-400">
                      -{((todayRecord.withdrawals || []).reduce((sum, w) => sum + w.amount, 0)).toLocaleString()} Ft
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Várható záró egyenleg</p>
                    <p className="text-xl font-semibold text-green-400">
                      {(todayRecord.opening_balance + stats.cash - (todayRecord.withdrawals || []).reduce((sum, w) => sum + w.amount, 0)).toLocaleString()} Ft
                    </p>
                  </div>
                </div>
                
                {/* Cash Withdrawal Section */}
                <div className="border-t border-slate-700 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-slate-300">Készpénz kivételek</h4>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => setShowWithdrawalDialog(true)}
                      className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                      data-testid="add-withdrawal-btn"
                    >
                      <Banknote className="w-4 h-4 mr-1" />
                      Új kivétel
                    </Button>
                  </div>
                  
                  {(todayRecord.withdrawals || []).length > 0 ? (
                    <div className="space-y-2">
                      {(todayRecord.withdrawals || []).map((w, idx) => (
                        <div key={w.withdrawal_id || idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 p-2 bg-slate-950/50 rounded-lg text-sm">
                          <div className="flex-1 min-w-0">
                            <span className="text-white font-medium">{w.reason}</span>
                            <span className="text-slate-500 text-xs ml-2">
                              {w.withdrawn_by} · {format(new Date(w.timestamp), "HH:mm", { locale: hu })}
                            </span>
                          </div>
                          <span className="text-red-400 font-semibold text-right">-{w.amount.toLocaleString()} Ft</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm text-center py-2">Nincs kivétel rögzítve</p>
                  )}
                </div>

                <div>
                  <Label className="text-slate-300">Megjegyzés</Label>
                  <Textarea
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white"
                    placeholder="Opcionális megjegyzés a napzáráshoz..."
                    data-testid="closing-notes-input"
                  />
                </div>

                {/* Closing Balance Input */}
                <div className="border-t border-slate-700 pt-4 space-y-3">
                  <Label className="text-white font-semibold text-base flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-blue-400" />
                    Kassza záró egyenleg
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-950/50 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Várható egyenleg</p>
                      <p className="text-lg font-bold text-green-400">
                        {(todayRecord.opening_balance + stats.cash - (todayRecord.withdrawals || []).reduce((sum, w) => sum + w.amount, 0)).toLocaleString()} Ft
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Tényleges kassza tartalom</p>
                      <Input
                        type="number"
                        value={closingBalance}
                        onChange={(e) => setClosingBalance(e.target.value)}
                        className="bg-slate-950 border-slate-700 text-white text-lg font-semibold"
                        placeholder="Írd be a tényleges összeget..."
                        data-testid="closing-balance-input"
                      />
                    </div>
                  </div>
                  {closingBalance && (() => {
                    const expected = todayRecord.opening_balance + stats.cash - (todayRecord.withdrawals || []).reduce((sum, w) => sum + w.amount, 0);
                    const actual = parseFloat(closingBalance) || 0;
                    const diff = actual - expected;
                    return (
                      <div className={`p-3 rounded-lg border ${
                        Math.abs(diff) === 0 ? 'bg-green-500/10 border-green-500/30' :
                        'bg-red-500/10 border-red-500/30'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-300">Eltérés:</span>
                          <span className={`text-lg font-bold ${
                            Math.abs(diff) === 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {diff > 0 ? '+' : ''}{diff.toLocaleString()} Ft
                          </span>
                        </div>
                        {Math.abs(diff) === 0 && (
                          <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Kassza egyezik!
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <Button 
                  onClick={() => setShowCloseDayConfirm(true)}
                  className="w-full bg-blue-600 hover:bg-blue-500"
                  data-testid="close-day-btn"
                  disabled={!closingBalance}
                >
                  <Moon className="w-4 h-4 mr-2" />
                  Nap lezárása
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Close Day Confirmation Dialog */}
      <Dialog open={showCloseDayConfirm} onOpenChange={setShowCloseDayConfirm}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-blue-400">Nap lezárása</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400">Biztosan le szeretnéd zárni a mai napot?</p>
          <p className="text-white">Telephely: <strong>{dayLoc}</strong></p>
          <p className="text-green-400 font-bold">Bevétel: {stats.today_revenue.toLocaleString()} Ft</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCloseDayConfirm(false)} className="border-slate-700">
              Mégse
            </Button>
            <Button onClick={handleCloseDay} className="bg-blue-600 hover:bg-blue-700">
              Nap lezárása
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Dialog */}
      <Dialog open={showWithdrawalDialog} onOpenChange={setShowWithdrawalDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-orange-400 flex items-center gap-2">
              <Banknote className="w-5 h-5" />
              Készpénz kivétel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Összeg (Ft)</Label>
              <Input
                type="number"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                className="bg-slate-950 border-slate-700 text-white"
                placeholder="0"
                data-testid="withdrawal-amount-input"
              />
            </div>
            <div>
              <Label className="text-slate-300">Indoklás</Label>
              <Input
                value={withdrawalReason}
                onChange={(e) => setWithdrawalReason(e.target.value)}
                className="bg-slate-950 border-slate-700 text-white"
                placeholder="Pl: Aprópénz váltás, Beszerzés..."
                data-testid="withdrawal-reason-input"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setShowWithdrawalDialog(false); setWithdrawalAmount(""); setWithdrawalReason(""); }} className="border-slate-700">
              Mégse
            </Button>
            <Button onClick={handleWithdrawal} className="bg-orange-600 hover:bg-orange-700">
              Kivétel rögzítése
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
