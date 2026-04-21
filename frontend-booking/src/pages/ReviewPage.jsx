import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Star, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const LABELS = ["", "Nagyon elégedetlen", "Elégedetlen", "Semleges", "Elégedett", "Nagyon elégedett"];

export default function ReviewPage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const initialRating = Math.min(5, Math.max(0, parseInt(searchParams.get("rating")) || 0));

  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [bookingInfo, setBookingInfo] = useState(null);

  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API}/bookings/by-review-token/${token}`)
      .then((res) => setBookingInfo(res.data))
      .catch(() => {});
  }, [token]);

  const handleSubmit = async () => {
    if (rating === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await axios.post(`${API}/reviews`, {
        review_token: token,
        rating,
        comment: comment.trim() || null,
      });
      setSubmitted(true);
    } catch (e) {
      setError(e.response?.data?.detail || "Hiba történt. Kérem próbálja újra.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Success screen ── */
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Köszönjük az értékelést!</h2>
          <p className="text-slate-400 text-sm">
            Visszajelzése segít minket abban, hogy folyamatosan fejlődhessünk.
          </p>
          <div className="flex justify-center gap-1 mt-6">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-7 h-7 ${s <= rating ? "text-yellow-400 fill-yellow-400" : "text-slate-700"}`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Main form ── */
  const displayRating = hoverRating || rating;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">✨</div>
          <h1 className="text-2xl font-bold text-white mb-1">Értékelje élményét</h1>
          {bookingInfo ? (
            <p className="text-slate-400 text-sm">
              {bookingInfo.service_name}
              {bookingInfo.date && ` · ${bookingInfo.date}`}
            </p>
          ) : (
            <p className="text-slate-500 text-sm">X-CLEAN autóápolás</p>
          )}
        </div>

        {/* Star selector */}
        <div className="flex justify-center gap-2 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110 focus:outline-none"
            >
              <Star
                className={`w-11 h-11 transition-colors duration-100 ${
                  star <= displayRating
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-slate-700 hover:text-slate-500"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Rating label */}
        <div className="text-center h-5 mb-6">
          {displayRating > 0 && (
            <span className="text-sm text-slate-400">{LABELS[displayRating]}</span>
          )}
        </div>

        {/* Comment box */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Írja le tapasztalatát (opcionális)..."
          rows={4}
          className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm resize-none mb-4 focus:outline-none focus:border-green-500 placeholder-slate-600 transition-colors"
        />

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm mb-4 bg-red-400/10 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
          className={`w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
            rating === 0
              ? "bg-slate-800 text-slate-600 cursor-not-allowed"
              : submitting
              ? "bg-green-700 cursor-wait"
              : "bg-green-600 hover:bg-green-500 active:scale-[0.98]"
          }`}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? "Küldés..." : "Értékelés beküldése"}
        </button>

        <p className="text-center text-slate-700 text-xs mt-5">
          X-CLEAN · Az értékelés névtelenül jelenik meg
        </p>
      </div>
    </div>
  );
}
