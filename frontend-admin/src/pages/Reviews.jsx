import { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth } from "../App";
import { toast } from "sonner";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Star, Trash2, MessageSquare, ThumbsUp } from "lucide-react";

const StarRow = ({ rating, size = "sm" }) => {
  const sz = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${sz} ${s <= rating ? "text-yellow-400 fill-yellow-400" : "text-slate-700"}`}
        />
      ))}
    </div>
  );
};

export const Reviews = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | 5 | 4 | 3 | 2 | 1

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${API}/reviews/admin`, { withCredentials: true });
      setReviews(res.data);
    } catch (e) {
      toast.error("Hiba az értékelések betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDelete = async (reviewId) => {
    try {
      await axios.delete(`${API}/reviews/${reviewId}`, { withCredentials: true });
      toast.success("Értékelés törölve");
      fetchReviews();
    } catch (e) {
      toast.error("Hiba a törlés során");
    }
  };

  const filtered = filter === "all" ? reviews : reviews.filter((r) => r.rating === parseInt(filter));

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : "–";

  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Manrope']">Értékelések</h1>
        <p className="text-slate-400 mt-1 text-sm">{reviews.length} beérkezett értékelés</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/15 flex items-center justify-center">
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{avgRating}</p>
              <p className="text-slate-400 text-sm">Átlagos értékelés</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/15 flex items-center justify-center">
              <ThumbsUp className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">
                {reviews.filter((r) => r.rating >= 4).length}
              </p>
              <p className="text-slate-400 text-sm">Pozitív (4–5 csillag)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">
                {reviews.filter((r) => r.comment).length}
              </p>
              <p className="text-slate-400 text-sm">Szöveges értékelés</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating distribution */}
      {reviews.length > 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-5">
            <h3 className="text-white font-medium mb-3">Eloszlás</h3>
            <div className="space-y-2">
              {dist.map(({ star, count }) => (
                <button
                  key={star}
                  onClick={() => setFilter(filter === String(star) ? "all" : String(star))}
                  className={`w-full flex items-center gap-3 group rounded-lg p-1 transition-colors ${
                    filter === String(star) ? "bg-yellow-500/10" : "hover:bg-slate-800"
                  }`}
                >
                  <StarRow rating={star} />
                  <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all"
                      style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="text-slate-400 text-sm w-6 text-right">{count}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter badge */}
      {filter !== "all" && (
        <div className="flex items-center gap-2">
          <Badge className="bg-yellow-500/20 text-yellow-400">
            {filter} csillagos értékelések ({filtered.length})
          </Badge>
          <button onClick={() => setFilter("all")} className="text-slate-500 hover:text-white text-sm">
            × Szűrő törlése
          </button>
        </div>
      )}

      {/* Reviews list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nincsenek értékelések</p>
          <p className="text-sm mt-1">Az ügyfelek a foglalás teljesítése után értékelhetnek</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((review) => (
            <Card
              key={review.review_id}
              className={`bg-slate-900 border-slate-800 overflow-hidden hover:border-yellow-500/30 transition-colors`}
            >
              <div
                className={`h-1 ${
                  review.rating === 5
                    ? "bg-gradient-to-r from-yellow-400 to-amber-500"
                    : review.rating >= 4
                    ? "bg-gradient-to-r from-green-400 to-emerald-500"
                    : review.rating >= 3
                    ? "bg-slate-600"
                    : "bg-gradient-to-r from-red-500 to-orange-500"
                }`}
              />
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <StarRow rating={review.rating} size="md" />
                    <p className="text-white font-medium mt-1">{review.customer_name}</p>
                    <p className="text-slate-500 text-xs">{review.service_name}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-slate-600 text-xs">
                      {review.created_at ? new Date(review.created_at).toLocaleDateString("hu-HU") : ""}
                    </span>
                    <button
                      onClick={() => handleDelete(review.review_id)}
                      className="text-slate-600 hover:text-red-400 transition-colors"
                      title="Törlés"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {review.comment && (
                  <p className="text-slate-300 text-sm leading-relaxed bg-slate-800/50 rounded-lg p-3 italic">
                    "{review.comment}"
                  </p>
                )}
                {review.location && (
                  <Badge variant="outline" className="border-slate-700 text-slate-500 text-xs mt-3">
                    {review.location}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
