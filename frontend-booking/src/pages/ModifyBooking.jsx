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
} from "lucide-react";

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
      try {
        const res = await axios.get(
          `${API}/bookings/available-slots?date=${newDate}&location=${booking.location}&duration=${booking.duration || 60}`
        );
        setSlots(res.data || []);
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
      setDoneMsg(`Foglalásod átütemezve: ${newDate} ${newTime}`);
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
      setDoneMsg("Foglalásod sikeresen lemondva.");
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
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white font-['Manrope']">X-CLEAN</h1>
          <p className="text-slate-400 text-sm mt-1">Autókozmetika – Foglalás kezelése</p>
        </div>

        {loading && (
          <Card className="bg-slate-900/90 border-slate-800">
            <CardContent className="p-8 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
              <p className="text-slate-400">Foglalás betöltése…</p>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="bg-slate-900/90 border-red-500/30">
            <CardContent className="p-8 flex flex-col items-center gap-3">
              <AlertTriangle className="w-10 h-10 text-red-400" />
              <p className="text-red-400 font-semibold text-center">{error}</p>
              <p className="text-slate-500 text-sm text-center">
                Ha segítségre van szükséged, vedd fel velünk a kapcsolatot!
              </p>
            </CardContent>
          </Card>
        )}

        {done && (
          <Card className="bg-slate-900/90 border-green-500/30">
            <CardContent className="p-8 flex flex-col items-center gap-3">
              <CheckCircle className="w-12 h-12 text-green-400" />
              <p className="text-green-400 font-bold text-lg text-center">{doneMsg}</p>
              <p className="text-slate-400 text-sm text-center">
                Hamarosan e-mailben is értesítünk a változásról.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && !done && booking && (
          <>
            {/* Booking summary */}
            <Card className="bg-slate-900/90 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Car className="w-5 h-5 text-green-400" />
                  Foglalás adatai
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-5">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400 w-28">Ügyfél:</span>
                  <span className="text-white">{booking.customer_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400 w-28">Rendszám:</span>
                  <span className="text-white font-mono">{booking.plate_number}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400 w-28">Szolgáltatás:</span>
                  <span className="text-white">{booking.service_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-white">{booking.date} {booking.time_slot}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-white">{booking.location}</span>
                </div>
              </CardContent>
            </Card>

            {/* Action */}
            {isCancelMode ? (
              <Card className="bg-slate-900/90 border-red-500/20">
                <CardHeader>
                  <CardTitle className="text-red-400 text-lg flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    Foglalás lemondása
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pb-5">
                  <p className="text-slate-400 text-sm">
                    Biztosan le szeretnéd mondani ezt a foglalást? Ez a művelet nem visszavonható.
                  </p>
                  <Button
                    onClick={handleCancel}
                    disabled={submitting}
                    className="w-full bg-red-600 hover:bg-red-500 text-white"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                    Igen, mondja le a foglalást
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-900/90 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    Időpont módosítása
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pb-5">
                  <div>
                    <Label className="text-slate-300 mb-1.5 block">Új dátum</Label>
                    <Input
                      type="date"
                      value={newDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => { setNewDate(e.target.value); setNewTime(""); }}
                      className="bg-slate-950 border-slate-700 text-white"
                    />
                  </div>

                  {newDate && (
                    <div>
                      <Label className="text-slate-300 mb-1.5 block">Szabad időpontok</Label>
                      {loadingSlots ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Időpontok betöltése…
                        </div>
                      ) : slots.length === 0 ? (
                        <p className="text-slate-500 text-sm">Ezen a napon nincs szabad időpont.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {slots.map((slot) => (
                            <button
                              key={slot}
                              onClick={() => setNewTime(slot)}
                              className={`py-2 rounded-lg text-sm border transition-all ${
                                newTime === slot
                                  ? "bg-green-500/20 border-green-500 text-green-400 font-semibold"
                                  : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={handleModify}
                    disabled={submitting || !newDate || !newTime}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Foglalás módosítása
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
