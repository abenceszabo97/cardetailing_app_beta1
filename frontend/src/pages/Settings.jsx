import { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth } from "../App";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { 
  Settings as SettingsIcon, 
  Users, 
  UserPlus,
  Plus,
  Shield,
  Phone,
  MapPin,
  Trash2
} from "lucide-react";

export const Settings = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNewWorkerOpen, setIsNewWorkerOpen] = useState(false);
  const [deleteWorkerId, setDeleteWorkerId] = useState(null);
  
  const [newWorker, setNewWorker] = useState({
    name: "",
    phone: "",
    location: "Debrecen"
  });

  const fetchData = async () => {
    try {
      const [usersRes, workersRes] = await Promise.all([
        axios.get(`${API}/users`, { withCredentials: true }),
        axios.get(`${API}/workers`, { withCredentials: true })
      ]);
      setUsers(usersRes.data);
      setWorkers(workersRes.data);
    } catch (error) {
      toast.error("Hiba az adatok betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      fetchData();
    }
  }, [user]);

  const handleUpdateRole = async (userId, role) => {
    try {
      await axios.put(`${API}/users/${userId}/role`, { role }, { withCredentials: true });
      toast.success("Szerepkör frissítve!");
      fetchData();
    } catch (error) {
      toast.error("Hiba a szerepkör frissítésekor");
    }
  };

  const handleCreateWorker = async () => {
    try {
      await axios.post(`${API}/workers`, newWorker, { withCredentials: true });
      toast.success("Dolgozó sikeresen létrehozva!");
      setIsNewWorkerOpen(false);
      setNewWorker({ name: "", phone: "", location: "Budapest" });
      fetchData();
    } catch (error) {
      toast.error("Hiba a dolgozó létrehozásakor");
    }
  };

  const handleDeleteWorker = async (workerId) => {
    if (!window.confirm("Biztosan törölni szeretnéd ezt a dolgozót?")) return;
    
    try {
      await axios.delete(`${API}/workers/${workerId}`, { withCredentials: true });
      toast.success("Dolgozó törölve!");
      fetchData();
    } catch (error) {
      toast.error("Hiba a dolgozó törlésekor");
    }
  };

  const handleSeedData = async () => {
    try {
      await axios.post(`${API}/seed`, {}, { withCredentials: true });
      toast.success("Minta adatok betöltve!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Hiba az adatok betöltésekor");
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Nincs jogosultságod a beállítások megtekintéséhez.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="settings-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Manrope']">Beállítások</h1>
          <p className="text-slate-400 mt-1">Admin jogosultságú beállítások</p>
        </div>
        <Button onClick={handleSeedData} variant="outline" className="border-slate-700 text-slate-300 hover:text-white" data-testid="seed-data-btn">
          Minta adatok betöltése
        </Button>
      </div>

      {/* Users Management */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-xl text-white font-['Manrope'] flex items-center gap-2">
            <Users className="w-5 h-5 text-green-400" />
            Felhasználók kezelése
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nincs felhasználó</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Név</TableHead>
                    <TableHead className="text-slate-400">Email</TableHead>
                    <TableHead className="text-slate-400 text-center">Szerepkör</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow 
                      key={u.user_id}
                      className="border-slate-800 hover:bg-white/5"
                      data-testid={`user-row-${u.user_id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {u.picture ? (
                            <img src={u.picture} alt={u.name} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm">{u.name?.charAt(0) || 'U'}</span>
                            </div>
                          )}
                          <span className="text-white font-medium">{u.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">{u.email}</TableCell>
                      <TableCell className="text-center">
                        <Select 
                          value={u.role} 
                          onValueChange={(v) => handleUpdateRole(u.user_id, v)}
                          disabled={u.user_id === user.user_id}
                        >
                          <SelectTrigger className="w-[120px] mx-auto bg-slate-950 border-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="admin" className="text-white">Admin</SelectItem>
                            <SelectItem value="dolgozo" className="text-white">Dolgozó</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workers Management */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl text-white font-['Manrope'] flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-400" />
            Dolgozók kezelése
          </CardTitle>
          <Dialog open={isNewWorkerOpen} onOpenChange={setIsNewWorkerOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-500" data-testid="new-worker-btn">
                <Plus className="w-4 h-4 mr-2" />
                Új dolgozó
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle className="text-xl font-['Manrope']">Új dolgozó hozzáadása</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-slate-300">Név</Label>
                  <Input
                    value={newWorker.name}
                    onChange={(e) => setNewWorker({...newWorker, name: e.target.value})}
                    className="bg-slate-950 border-slate-700 text-white"
                    placeholder="Teljes név"
                    data-testid="new-worker-name"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Telefonszám</Label>
                  <Input
                    value={newWorker.phone}
                    onChange={(e) => setNewWorker({...newWorker, phone: e.target.value})}
                    className="bg-slate-950 border-slate-700 text-white"
                    placeholder="+36 30 123 4567"
                    data-testid="new-worker-phone"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Telephely</Label>
                  <Select value={newWorker.location} onValueChange={(v) => setNewWorker({...newWorker, location: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700" data-testid="new-worker-location">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleCreateWorker}
                  className="w-full bg-green-600 hover:bg-green-500"
                  disabled={!newWorker.name}
                  data-testid="create-worker-submit"
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
              <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nincs dolgozó</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Név</TableHead>
                    <TableHead className="text-slate-400">Telefonszám</TableHead>
                    <TableHead className="text-slate-400">Telephely</TableHead>
                    <TableHead className="text-slate-400 w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers.map((worker) => (
                    <TableRow 
                      key={worker.worker_id}
                      className="border-slate-800 hover:bg-white/5"
                      data-testid={`worker-row-${worker.worker_id}`}
                    >
                      <TableCell className="text-white font-medium">{worker.name}</TableCell>
                      <TableCell className="text-slate-300">
                        <span className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-500" />
                          {worker.phone || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-slate-600 text-slate-300">
                          <MapPin className="w-3 h-3 mr-1" />
                          {worker.location}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-slate-400 hover:text-red-400"
                          onClick={() => handleDeleteWorker(worker.worker_id)}
                          data-testid={`delete-worker-${worker.worker_id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
