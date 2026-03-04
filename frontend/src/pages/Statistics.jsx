import { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { 
  BarChart3, 
  MapPin,
  TrendingUp,
  Users,
  Sparkles
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format } from "date-fns";
import { hu } from "date-fns/locale";

export const Statistics = () => {
  const { user } = useAuth();
  const [dailyStats, setDailyStats] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [workerStats, setWorkerStats] = useState([]);
  const [serviceStats, setServiceStats] = useState([]);
  const [locationStats, setLocationStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState("all");

  const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#ec4899', '#14b8a6'];

  const fetchStats = async () => {
    try {
      const locationParam = selectedLocation !== "all" ? `?location=${selectedLocation}` : "";
      const [dailyRes, monthlyRes, workerRes, serviceRes, locationRes] = await Promise.all([
        axios.get(`${API}/stats/daily${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/stats/monthly${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/stats/workers${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/stats/services${locationParam}`, { withCredentials: true }),
        axios.get(`${API}/stats/locations`, { withCredentials: true })
      ]);
      setDailyStats(dailyRes.data);
      setMonthlyStats(monthlyRes.data);
      setWorkerStats(workerRes.data);
      setServiceStats(serviceRes.data.slice(0, 10));
      setLocationStats(locationRes.data);
    } catch (error) {
      toast.error("Hiba a statisztikák betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedLocation]);

  const CustomTooltip = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-400 text-sm mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-white font-semibold">
              {entry.name}: {formatter ? formatter(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="statistics-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Manrope']">Statisztika</h1>
          <p className="text-slate-400 mt-1">Részletes kimutatások</p>
        </div>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-[180px] bg-slate-900 border-slate-700 text-white" data-testid="stats-location-select">
            <MapPin className="w-4 h-4 mr-2 text-green-400" />
            <SelectValue placeholder="Telephely" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            <SelectItem value="all" className="text-white">Összes telephely</SelectItem>
            <SelectItem value="Budapest" className="text-white">Budapest</SelectItem>
            <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg text-white font-['Manrope'] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-400" />
              Napi autók (aktuális hónap)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyStats.length === 0 ? (
              <div className="text-center py-8 text-slate-400">Nincs adat</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickFormatter={(value) => format(new Date(value), 'MM/dd')}
                  />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} name="Autók" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly Revenue Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg text-white font-['Manrope'] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Havi bevétel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyStats.length === 0 ? (
              <div className="text-center py-8 text-slate-400">Nincs adat</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip formatter={(v) => `${v.toLocaleString()} Ft`} />} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Bevétel" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Worker Performance */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg text-white font-['Manrope'] flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Dolgozói teljesítmény (havi)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workerStats.length === 0 ? (
              <div className="text-center py-8 text-slate-400">Nincs adat</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={workerStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis 
                    type="category" 
                    dataKey="worker_name" 
                    stroke="#94a3b8" 
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#a855f7" radius={[0, 4, 4, 0]} name="Autók" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Service Popularity */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg text-white font-['Manrope'] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-400" />
              Legnépszerűbb szolgáltatások
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serviceStats.length === 0 ? (
              <div className="text-center py-8 text-slate-400">Nincs adat</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={serviceStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis 
                    type="category" 
                    dataKey="service_name" 
                    stroke="#94a3b8" 
                    tick={{ fill: '#94a3b8', fontSize: 9 }}
                    width={120}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} name="Darab" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Location Distribution */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-white font-['Manrope'] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-400" />
              Telephely bontás (havi)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {locationStats.length === 0 ? (
              <div className="text-center py-8 text-slate-400">Nincs adat</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={locationStats}
                      dataKey="count"
                      nameKey="location"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {locationStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-4">
                  {locationStats.map((loc, index) => (
                    <div key={loc.location} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-white font-medium">{loc.location}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">{loc.count} autó</p>
                        <p className="text-green-400 text-sm">{loc.revenue.toLocaleString()} Ft</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
