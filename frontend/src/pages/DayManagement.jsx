import { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth } from "../App";
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
  const [selectedLocation, setSelectedLocation] = useState("Budapest");
  const [todayRecord, setTodayRecord] = useState(null);
  const [stats, setStats] = useState({ today_cars: 0, today_revenue: 0, cash: 0, card: 0 });
  const [todayJobs, setTodayJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [openingBalance, setOpeningBalance] = useState("");
  const [closingNotes, setClosingNotes] = useState("");

  const fetchData = async () => {
    try {
      const [recordRes, jobsRes] = await Promise.all([
        axios.get(`${API}/day-records/today?location=${selectedLocation}`, { withCredentials: true }),
        axios.get(`${API}/jobs/today?location=${selectedLocation}`, { withCredentials: true })
      ]);
      
      setTodayRecord(recordRes.data);
      setTodayJobs(jobsRes.data);
      
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
    fetchData();
  }, [selectedLocation]);

  const handleOpenDay = async () => {
    try {
      await axios.post(`${API}/day-records/open`, {
        location: selectedLocation,
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
    if (!window.confirm("Biztosan le szeretnéd zárni a mai napot?")) return;
    
    try {
      await axios.post(`${API}/day-records/close`, {
        location: selectedLocation,
        notes: closingNotes
      }, { withCredentials: true });
      
      toast.success("Nap sikeresen lezárva!");
      setClosingNotes("");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba a napzárásnál");
    }
  };

  const generateDayClosePDF = () => {
    const doc = new jsPDF();
    const today = format(new Date(), "yyyy. MMMM dd.", { locale: hu });
    
    doc.setFontSize(20);
    doc.text("X-CLEAN Napi Zarasi Osszesito", 14, 22);
    doc.setFontSize(12);
    doc.text(`Datum: ${today}`, 14, 32);
    doc.text(`Telephely: ${selectedLocation}`, 14, 40);
    doc.text(`Nyito egyenleg: ${(todayRecord?.opening_balance || 0).toLocaleString()} Ft`, 14, 48);
    
    doc.setFontSize(14);
    doc.text("Napi osszesites", 14, 62);
    
    autoTable(doc, {
      startY: 68,
      head: [["Megnevezes", "Ertek"]],
      body: [
        ["Elkeszult autok", `${stats.today_cars} db`],
        ["Osszes bevetel", `${stats.today_revenue.toLocaleString()} Ft`],
        ["Keszpenz bevetel", `${stats.cash.toLocaleString()} Ft`],
        ["Kartya bevetel", `${stats.card.toLocaleString()} Ft`],
        ["Varhato zaro egyenleg", `${((todayRecord?.opening_balance || 0) + stats.cash).toLocaleString()} Ft`],
      ],
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59] },
    });
    
    const completedJobs = todayJobs.filter(j => j.status === "kesz");
    if (completedJobs.length > 0) {
      const finalY = doc.lastAutoTable?.finalY || 120;
      doc.setFontSize(14);
      doc.text("Elkeszult munkak", 14, finalY + 14);
      
      autoTable(doc, {
        startY: finalY + 20,
        head: [["Rendszam", "Szolgaltatas", "Fizetes", "Osszeg"]],
        body: completedJobs.map(j => [
          j.plate_number || "-",
          j.service_name || "-",
          j.payment_method === "keszpenz" ? "Keszpenz" : "Kartya",
          `${j.price.toLocaleString()} Ft`
        ]),
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59] },
      });
    }
    
    return doc;
  };

  const handleDownloadPDF = () => {
    const doc = generateDayClosePDF();
    const today = format(new Date(), "yyyy-MM-dd");
    const filename = `xclean_napzaras_${selectedLocation}_${today}.pdf`;
    
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("PDF letöltve!");
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
        subject: `X-CLEAN Napi zaras - ${selectedLocation} - ${today}`,
        html_content: `<h2>X-CLEAN Napi Zarasi Osszesito</h2>
          <p><strong>Datum:</strong> ${today}</p>
          <p><strong>Telephely:</strong> ${selectedLocation}</p>
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
    <div className="space-y-6" data-testid="day-management-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Manrope']">Napnyitás / Napzárás</h1>
          <p className="text-slate-400 mt-1">
            {format(new Date(), 'yyyy. MMMM d. EEEE', { locale: hu })}
          </p>
        </div>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-[180px] bg-slate-900 border-slate-700 text-white" data-testid="day-location-select">
            <MapPin className="w-4 h-4 mr-2 text-green-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            <SelectItem value="Budapest" className="text-white">Budapest</SelectItem>
            <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Day Status Card */}
      <Card className={`glass-card ${todayRecord?.status === 'closed' ? 'border-green-500/30' : todayRecord ? 'border-orange-500/30' : 'border-red-500/30'}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {todayRecord?.status === 'closed' ? (
              <>
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <Lock className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-green-400 font-semibold">Nap lezárva</p>
                  <p className="text-slate-400 text-sm">A mai nap le van zárva a(z) {selectedLocation} telephelyen</p>
                </div>
              </>
            ) : todayRecord ? (
              <>
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <Sun className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-orange-400 font-semibold">Nap nyitva</p>
                  <p className="text-slate-400 text-sm">Nyitó egyenleg: {todayRecord.opening_balance.toLocaleString()} Ft</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <Moon className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-red-400 font-semibold">Nap nincs nyitva</p>
                  <p className="text-slate-400 text-sm">Nyisd meg a napot a munkavégzés megkezdéséhez</p>
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
            <div>
              <Label className="text-slate-300">Nyitó egyenleg (Ft)</Label>
              <Input
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="bg-slate-950 border-slate-700 text-white"
                placeholder="0"
                data-testid="opening-balance-input"
              />
              <p className="text-xs text-slate-500 mt-1">A kasszában lévő készpénz összege</p>
            </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Mai autók</p>
                    <p className="text-3xl font-bold text-white mt-1">{stats.today_cars}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <Car className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Mai bevétel</p>
                    <p className="text-3xl font-bold text-white mt-1">{stats.today_revenue.toLocaleString()} Ft</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Banknote className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Készpénz</p>
                    <p className="text-3xl font-bold text-green-400 mt-1">{stats.cash.toLocaleString()} Ft</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Kártya</p>
                    <p className="text-3xl font-bold text-blue-400 mt-1">{stats.card.toLocaleString()} Ft</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* PDF Export Buttons */}
          <div className="flex gap-3" data-testid="day-export-buttons">
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
                    <p className="text-sm text-slate-400">Várható záró egyenleg</p>
                    <p className="text-xl font-semibold text-green-400">
                      {(todayRecord.opening_balance + stats.cash).toLocaleString()} Ft
                    </p>
                  </div>
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
                <Button 
                  onClick={handleCloseDay}
                  className="w-full bg-blue-600 hover:bg-blue-500"
                  data-testid="close-day-btn"
                >
                  <Moon className="w-4 h-4 mr-2" />
                  Nap lezárása
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
