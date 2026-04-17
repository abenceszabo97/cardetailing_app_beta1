import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API, useAuth, useLocation2 } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  FileText,
  Receipt,
  Download,
  Mail,
  Search,
  TrendingUp,
  Building2,
  User,
  MapPin,
  Loader2,
  ExternalLink,
  CheckCircle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

const MONTHS_HU = [
  "Január", "Február", "Március", "Április", "Május", "Június",
  "Július", "Augusztus", "Szeptember", "Október", "November", "December",
];

function buildMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 13; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getFullYear()} ${MONTHS_HU[d.getMonth()]}`;
    options.push({ value, label });
  }
  return options;
}

const MONTH_OPTIONS = buildMonthOptions();

const BILLING_ENTITY_LABELS = {
  budapest: "Budapest (X cég)",
  debrecen_private: "Debrecen – Magánszemély (Y cég)",
  debrecen_company: "Debrecen – Cég (Z cég)",
};

export const Invoices = () => {
  const { user } = useAuth();
  const { selectedLocation } = useLocation2();

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterMonth, setFilterMonth] = useState(thisMonth);
  const [searchQuery, setSearchQuery] = useState("");
  const [resendingId, setResendingId] = useState(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterLocation !== "all") params.set("location", filterLocation);
      if (filterMonth) params.set("month", filterMonth);

      const res = await axios.get(`${API}/invoices?${params.toString()}`, { withCredentials: true });
      setInvoices(res.data.invoices || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      toast.error("Hiba a számlák betöltésekor");
    } finally {
      setLoading(false);
    }
  }, [filterLocation, filterMonth]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleResendEmail = async (invoiceId) => {
    setResendingId(invoiceId);
    try {
      const res = await axios.post(`${API}/invoices/${invoiceId}/resend-email`, {}, { withCredentials: true });
      toast.info(res.data.message || "Email újraküldési kérés elküldve");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Hiba az email küldésekor");
    } finally {
      setResendingId(null);
    }
  };

  const handleToggleStatus = async (invoice) => {
    const newStatus = invoice.status === "fizetve" ? "fizetesre_var" : "fizetve";
    try {
      await axios.put(`${API}/invoices/${invoice.invoice_id}/status?status=${newStatus}`, {}, { withCredentials: true });
      toast.success("Státusz frissítve!");
      fetchInvoices();
    } catch {
      toast.error("Hiba a státusz módosításakor");
    }
  };

  const filtered = invoices.filter((inv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.customer_name?.toLowerCase().includes(q) ||
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.location?.toLowerCase().includes(q)
    );
  });

  const getMonthLabel = (val) => {
    const opt = MONTH_OPTIONS.find((o) => o.value === val);
    return opt ? opt.label : val;
  };

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="invoices-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Manrope']">Számlák</h1>
        <p className="text-slate-400 mt-1 text-sm sm:text-base">Kiállított számlák és nyugták nyilvántartása</p>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Location */}
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="bg-slate-950 border-slate-700 text-white w-full sm:w-44">
                <MapPin className="w-4 h-4 mr-2 text-green-400 shrink-0" />
                <SelectValue placeholder="Telephely" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="all" className="text-white hover:bg-slate-800">Összes telephely</SelectItem>
                <SelectItem value="Debrecen" className="text-white hover:bg-slate-800">Debrecen</SelectItem>
                <SelectItem value="Budapest" className="text-white hover:bg-slate-800">Budapest</SelectItem>
              </SelectContent>
            </Select>

            {/* Month */}
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="bg-slate-950 border-slate-700 text-white w-full sm:w-52">
                <SelectValue placeholder="Hónap" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
                <SelectItem value="all" className="text-white hover:bg-slate-800">Összes hónap</SelectItem>
                {MONTH_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-slate-800">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ügyfél neve, számlaszám…"
                className="bg-slate-950 border-slate-700 text-white pl-9"
              />
            </div>

            <Button onClick={fetchInvoices} variant="outline" className="border-slate-700 text-slate-300 hover:text-white shrink-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Frissítés"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-slate-400 text-xs">Összes tétel</p>
            <p className="text-white font-bold text-xl">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-slate-400 text-xs">Összérték</p>
            <p className="text-green-400 font-bold text-xl">{total.toLocaleString()} Ft</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-slate-400 text-xs">Számlák</p>
            <p className="text-amber-400 font-bold text-xl">{filtered.filter(i => !i.is_receipt).length}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-slate-400 text-xs">Nyugták</p>
            <p className="text-blue-400 font-bold text-xl">{filtered.filter(i => i.is_receipt).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice list */}
      <Card className="glass-card">
        <CardHeader className="p-4 sm:p-6 pb-0">
          <CardTitle className="text-lg text-white font-['Manrope'] flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            {filterMonth !== "all" ? getMonthLabel(filterMonth) : "Összes"} — számlák és nyugták
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400">Nincs találat a szűrési feltételekre</p>
              <p className="text-slate-600 text-sm mt-1">Próbálj más hónapot vagy telephelyet választani</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((inv) => (
                <div
                  key={inv.invoice_id}
                  className="bg-slate-900/60 rounded-xl border border-slate-800 p-3 sm:p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    {/* Left: icon + type */}
                    <div className="flex items-center gap-3 sm:w-8">
                      {inv.is_receipt ? (
                        <Receipt className="w-5 h-5 text-blue-400 shrink-0" />
                      ) : (
                        <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                      )}
                    </div>

                    {/* Middle: info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-white font-medium truncate">{inv.customer_name}</span>
                        <Badge className={`text-xs ${inv.is_receipt ? "bg-blue-500/20 text-blue-300" : "bg-amber-500/20 text-amber-300"}`}>
                          {inv.is_receipt ? "Nyugta" : "Számla"}
                        </Badge>
                        {inv.is_company && (
                          <Badge className="text-xs bg-purple-500/20 text-purple-300">
                            <Building2 className="w-3 h-3 mr-1" />
                            Cég
                          </Badge>
                        )}
                        <Badge className={`text-xs ${inv.status === "fizetve" ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400"}`}>
                          {inv.status === "fizetve" ? (
                            <><CheckCircle className="w-3 h-3 mr-1 inline" />Fizetve</>
                          ) : (
                            <><Clock className="w-3 h-3 mr-1 inline" />Fizetésre vár</>
                          )}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500">
                        {inv.invoice_number && (
                          <span className="font-mono text-slate-400">#{inv.invoice_number}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{inv.location}
                        </span>
                        <span>{BILLING_ENTITY_LABELS[inv.billing_entity] || inv.billing_entity}</span>
                        <span>{inv.payment_method === "keszpenz" ? "💵 Készpénz" : inv.payment_method === "kartya" ? "💳 Kártya" : "🏦 Átutalás"}</span>
                        <span>{inv.created_at ? format(new Date(inv.created_at), "yyyy. MM. dd. HH:mm", { locale: hu }) : ""}</span>
                      </div>
                    </div>

                    {/* Right: amount + actions */}
                    <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end">
                      <span className="text-green-400 font-bold text-lg">{Number(inv.amount).toLocaleString()} Ft</span>
                      <div className="flex gap-1">
                        {/* Toggle payment status */}
                        {user?.role === "admin" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className={`h-8 text-xs px-2 ${inv.status === "fizetve" ? "border-green-500/40 text-green-400" : "border-orange-500/40 text-orange-400"}`}
                            onClick={() => handleToggleStatus(inv)}
                            title={inv.status === "fizetve" ? "Megjelölés: fizetésre vár" : "Megjelölés: fizetve"}
                          >
                            {inv.status === "fizetve" ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                        {/* Resend email */}
                        {inv.customer_email && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs px-2 border-slate-700 text-slate-400 hover:text-white"
                            onClick={() => handleResendEmail(inv.invoice_id)}
                            disabled={resendingId === inv.invoice_id}
                            title="Email újraküldése"
                          >
                            {resendingId === inv.invoice_id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Mail className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        )}
                        {/* Open on Számlázz.hu */}
                        {inv.invoice_number && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs px-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                            onClick={() => window.open("https://www.szamlazz.hu", "_blank")}
                            title="Megnyitás Számlázz.hu-n"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Monthly total footer */}
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-700">
                <span className="text-slate-400 text-sm font-medium">
                  {filtered.length} tétel összesen
                  {filterMonth !== "all" && ` – ${getMonthLabel(filterMonth)}`}
                </span>
                <span className="text-green-400 font-bold text-xl">
                  {filtered.reduce((s, i) => s + Number(i.amount || 0), 0).toLocaleString()} Ft
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
