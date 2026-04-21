/**
 * Self-service booking modification / cancellation page
 * Accessed via email link: /modify/{token}?action=cancel
 */
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { API } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Calendar,
  Clock,
  Car,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  MapPin,
  Sparkles,
} from "lucide-react";

const HU_DAYS = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];

function formatDateHu(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return `${dateStr} (${HU_DAYS[d.getDay()]})`;
}

export default function ModifyBooking() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const isCancelMode = searchParams.get("action") === "cancel";

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [doneMsg, setDoneMsg] = useState("");
  const [doneSub, setDoneSub] = useState("");

  // Rescheduling state
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/bookings/by-token/${token}`);
        setBooking(res.data);
        setNewDate(res.data.date || "");
      } catch (e) {
        setError(e.response?.data?.detail || "Nem sikerült betölteni a foglalást.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  useEffect(() => {
    if (!newDate || !booking) return;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      setNewTime("");
      try {
        const res = await axios.get(
          `${API}/bookings/available-slots?date=${newDate}&location=${booking.location}&duration=${booking.duration || 60}`
        );
        // API returns objects: { time_slot, is_available, available_workers, ... }
        const available = (res.data || []).filter(s => s.is_available);
        setSlots(available);
      } catch {
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [newDate, booking]);

  const handleModify = async () => {
    if (!newDate || !newTime) {
      toast.error("Válassz dátumot és időpontot!");
      return;
    }
    setSubmitting(true);
    try {
      await axios.put(`${API}/bookings/by-token/${token}/modify?date=${newDate}&time_slot=${newTime}`);
      setDoneMsg("Foglalásod sikeresen átütemezve!");
      setDoneSub(`Új időpont: ${formatDateHu(newDate)} ${newTime}`);
      setDone(true);
      toast.success("Foglalás módosítva!");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba a módosítás során");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setSubmitting(true);
    try {
      await axios.put(`${API}/bookings/by-token/${token}/cancel`);
      setDoneMsg("Foglalásod lemondva.");
      setDoneSub("Hamarosan e-mailben is értesítünk. Reméljük, legközelebb találkozunk!");
      setDone(true);
      toast.success("Foglalás lemondva");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba a lemondás során");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-green-400" />
            <h1 className="text-3xl font-bold text-white font-['Manrope'] tracking-tight">X-CLEAN</h1>
            <Sparkles className="w-6 h-6 text-green-400" />
          </div>
          <p className="text-slate-400 text-sm">
            {isCancelMode ? "Foglalás lemondása" : "Foglalás módosítása"}
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <Card className="bg-slate-900/90 border-slate-800">
            <CardContent className="p-10 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
              <p className="text-slate-400">Foglalás betöltése…</p>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="bg-slate-900/90 border-red-500/30">
            <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-red-400 font-semibold">{error}</p>
              <p className="text-slate-500 text-sm">
                Ha segítségre van szükséged, kérjük vedd fel velünk a kapcsolatot!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Success */}
        {done && (
          <Card className={`bg-slate-900/90 ${isCancelMode ? "border-slate-600" : "border-green-500/40"}`}>
            <CardContent className="p-10 flex flex-col items-center gap-3 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isCancelMode ? "bg-slate-700/50" : "bg-green-500/10"}`}>
                <CheckCircle className={`w-9 h-9 ${isCancelMode ? "text-slate-400" : "text-green-400"}`} />
              </div>
              <p className={`font-bold text-lg ${isCancelMode ? "text-slate-300" : "text-green-400"}`}>{doneMsg}</p>
              {doneSub && <p className="text-slate-400 text-sm">{doneSub}</p>}
            </CardContent>
          </Card>
        )}

        {/* Main content */}
        {!loading && !error && !done && booking && (
          <>
            {/* Booking summary */}
            <Card className="bg-slate-900/90 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Car className="w-4 h-4 text-green-400" />
                  Foglalás adatai
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-5">
                <Row label="Ügyfél" value={booking.customer_name} />
                <Row label="Rendszám" value={booking.plate_number} mono />
                <Row label="Szolgáltatás" value={booking.service_name} />
                <div className="flex items-center gap-2 text-sm pt-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-white">{formatDateHu(booking.date)} · {booking.time_slot}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-white">{booking.location}</span>
                </div>
              </CardContent>
            </Card>

            {/* Cancel mode */}
            {isCancelMode ? (
              <Card className="bg-slate-900/90 border-red-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-red-400 text-base flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Foglalás lemondása
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pb-5">
                  <p className="text-slate-400 text-sm">
                    Biztosan le szeretnéd mondani ezt a foglalást?<br />
                    <span className="text-slate-500">Ez a művelet nem visszavonható.</span>
                  </p>
                  <Button
                    onClick={handleCancel}
                    disabled={submitting}
                    className="w-full bg-red-600 hover:bg-red-500 text-white"
                  >
                    {submitting
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Lemondás folyamatban…</>
                      : <><XCircle className="w-4 h-4 mr-2" />Igen, mondom le a foglalást</>
                    }
                  </Button>
                  <p className="text-center text-slate-600 text-xs">
                    Ha mégsem szeretnéd lemondani, egyszerűen zárd be ezt az oldalt.
                  </p>
                </CardContent>
              </Card>
            ) : (
              /* Modify mode */
              <Card className="bg-slate-900/90 border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    Időpont módosítása
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pb-5">
                  <div>
                    <Label className="text-slate-300 mb-1.5 block text-sm">Válassz új dátumot</Label>
                    <Input
                      type="date"
                      value={newDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white"
                    />
                    {newDate && (
                      <p className="text-slate-500 text-xs mt-1">{formatDateHu(newDate)}</p>
                    )}
                  </div>

                  {newDate && (
                    <div>
                      <Label className="text-slate-300 mb-2 block text-sm">
                        Szabad időpontok{" "}
                        <span className="text-slate-500 font-normal">({slots.length} szabad)</span>
                      </Label>
                      {loadingSlots ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm py-3">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Időpontok betöltése…
                        </div>
                      ) : slots.length === 0 ? (
                        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                          <p className="text-slate-500 text-sm">Ezen a napon nincs szabad időpont.</p>
                          <p className="text-slate-600 text-xs mt-1">Válassz másik napot!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {slots.map((slot) => (
                            <button
                              key={slot.time_slot}
                              onClick={() => setNewTime(slot.time_slot)}
                              className={`py-2.5 rounded-lg text-sm border transition-all font-medium ${
                                newTime === slot.time_slot
                                  ? "bg-green-500/20 border-green-500 text-green-400"
                                  : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
                              }`}
                            >
                              {slot.time_slot}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {newTime && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-sm text-blue-300 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      Kiválasztott időpont: <strong>{formatDateHu(newDate)} {newTime}</strong>
                    </div>
                  )}

                  <Button
                    onClick={handleModify}
                    disabled={submitting || !newDate || !newTime}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white disabled:opacity-50"
                  >
                    {submitting
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Módosítás folyamatban…</>
                      : <><CheckCircle className="w-4 h-4 mr-2" />Foglalás módosítása</>
                    }
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <p className="text-center text-slate-700 text-xs pb-4">
          X-CLEAN Autókozmetika · Ha kérdésed van, hívj minket!
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-slate-500 w-28 flex-shrink-0">{label}:</span>
      <span className={`text-white ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
