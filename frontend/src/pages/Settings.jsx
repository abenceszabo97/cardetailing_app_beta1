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
  Trash2,
  Key,
  UserCog,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  Lock
} from "lucide-react";

// Change Password Form Component
const ChangePasswordForm = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("Az új jelszavak nem egyeznek!");
      return;
    }
    
    if (newPassword.length < 4) {
      toast.error("A jelszó legalább 4 karakter legyen!");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/auth/change-password`, {
        current_password: currentPassword,
        new_password: newPassword
      }, { withCredentials: true });
      
      toast.success("Jelszó sikeresen megváltoztatva!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba a jelszó megváltoztatásakor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleChangePassword} className="space-y-4">
      <div>
        <Label className="text-slate-300">Jelenlegi jelszó</Label>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="bg-slate-950 border-slate-700 text-white pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <Label className="text-slate-300">Új jelszó</Label>
        <Input
          type={showPassword ? "text" : "password"}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="bg-slate-950 border-slate-700 text-white"
          placeholder="Minimum 4 karakter"
          required
        />
      </div>
      <div>
        <Label className="text-slate-300">Új jelszó megerősítése</Label>
        <Input
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="bg-slate-950 border-slate-700 text-white"
          required
        />
      </div>
      <Button
        type="submit"
        disabled={loading || !currentPassword || !newPassword || !confirmPassword}
        className="w-full bg-yellow-600 hover:bg-yellow-500"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mentés...</>
        ) : (
          <><Lock className="w-4 h-4 mr-2" /> Jelszó megváltoztatása</>
        )}
      </Button>
    </form>
  );
};

export const Settings = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNewWorkerOpen, setIsNewWorkerOpen] = useState(false);
  const [isNewUserOpen, setIsNewUserOpen] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState(null);
  const [deleteWorkerId, setDeleteWorkerId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  
  const [newWorker, setNewWorker] = useState({
    name: "",
    phone: "",
    location: "Debrecen"
  });

  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    role: "dolgozo",
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
      setNewWorker({ name: "", phone: "", location: "Debrecen" });
      fetchData();
    } catch (error) {
      toast.error("Hiba a dolgozó létrehozásakor");
    }
  };

  const handleDeleteWorker = async (workerId) => {
    try {
      await axios.delete(`${API}/workers/${workerId}`, { withCredentials: true });
      toast.success("Dolgozó törölve!");
      fetchData();
      setDeleteWorkerId(null);
    } catch (error) {
      toast.error("Hiba a dolgozó törlésekor");
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.name) {
      toast.error("Töltsd ki a kötelező mezőket!");
      return;
    }
    try {
      await axios.post(`${API}/auth/create-user`, newUser, { withCredentials: true });
      toast.success("Felhasználó sikeresen létrehozva!");
      setIsNewUserOpen(false);
      setNewUser({ username: "", password: "", name: "", email: "", role: "dolgozo", location: "Debrecen" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba a felhasználó létrehozásakor");
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      toast.error("A jelszó legalább 4 karakter legyen!");
      return;
    }
    try {
      await axios.put(`${API}/auth/reset-password/${resetPasswordUserId}`, { new_password: newPassword }, { withCredentials: true });
      toast.success("Jelszó visszaállítva!");
      setResetPasswordUserId(null);
      setNewPassword("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba a jelszó visszaállításakor");
    }
  };

  const handleToggleUserActive = async (userId) => {
    try {
      const response = await axios.put(`${API}/auth/toggle-user/${userId}`, {}, { withCredentials: true });
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error("Hiba a felhasználó státusz változtatásakor");
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
    // Non-admin users can only see their own profile and change password
    return (
      <div className="space-y-6" data-testid="settings-page">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Manrope']">Beállítások</h1>
          <p className="text-slate-400 mt-1">Személyes beállítások</p>
        </div>
        
        {/* Profile Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-xl text-white font-['Manrope'] flex items-center gap-2">
              <UserCog className="w-5 h-5 text-green-400" />
              Profil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl font-medium">{user?.name?.charAt(0) || 'U'}</span>
              </div>
              <div>
                <p className="text-white font-medium text-lg">{user?.name}</p>
                <p className="text-slate-400">@{user?.username || 'n/a'}</p>
                <Badge className="mt-1 bg-blue-500/20 text-blue-300">{user?.role === 'admin' ? 'Admin' : 'Dolgozó'}</Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
              <div>
                <span className="text-slate-400 text-sm">Email</span>
                <p className="text-white">{user?.email || '-'}</p>
              </div>
              <div>
                <span className="text-slate-400 text-sm">Telephely</span>
                <p className="text-white">{user?.location || 'Nincs megadva'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Change Password Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-xl text-white font-['Manrope'] flex items-center gap-2">
              <Key className="w-5 h-5 text-yellow-400" />
              Jelszó megváltoztatása
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl text-white font-['Manrope'] flex items-center gap-2">
            <Users className="w-5 h-5 text-green-400" />
            Felhasználók kezelése
          </CardTitle>
          <Dialog open={isNewUserOpen} onOpenChange={setIsNewUserOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-500" data-testid="new-user-btn">
                <Plus className="w-4 h-4 mr-2" />
                Új felhasználó
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle className="text-xl font-['Manrope']">Új felhasználó létrehozása</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-slate-300">Felhasználónév *</Label>
                  <Input
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    className="bg-slate-950 border-slate-700 text-white"
                    placeholder="pelda.felhasznalo"
                    data-testid="new-user-username"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Jelszó *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      className="bg-slate-950 border-slate-700 text-white pr-10"
                      placeholder="••••••••"
                      data-testid="new-user-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-300">Teljes név *</Label>
                  <Input
                    value={newUser.name}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    className="bg-slate-950 border-slate-700 text-white"
                    placeholder="Kovács Péter"
                    data-testid="new-user-name"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Email</Label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="bg-slate-950 border-slate-700 text-white"
                    placeholder="pelda@xclean.hu"
                    data-testid="new-user-email"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Szerepkör</Label>
                  <Select value={newUser.role} onValueChange={(v) => setNewUser({...newUser, role: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700" data-testid="new-user-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="admin" className="text-white">Admin</SelectItem>
                      <SelectItem value="dolgozo" className="text-white">Dolgozó</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleCreateUser}
                  className="w-full bg-green-600 hover:bg-green-500"
                  disabled={!newUser.username || !newUser.password || !newUser.name}
                  data-testid="create-user-submit"
                >
                  Létrehozás
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                    <TableHead className="text-slate-400">Felhasználónév</TableHead>
                    <TableHead className="text-slate-400">Email</TableHead>
                    <TableHead className="text-slate-400 text-center">Szerepkör</TableHead>
                    <TableHead className="text-slate-400 text-center">Státusz</TableHead>
                    <TableHead className="text-slate-400 w-24">Műveletek</TableHead>
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
                      <TableCell className="text-slate-300 font-mono text-sm">{u.username || "-"}</TableCell>
                      <TableCell className="text-slate-300">{u.email || "-"}</TableCell>
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
                      <TableCell className="text-center">
                        <Badge 
                          variant={u.active !== false ? "default" : "destructive"}
                          className={u.active !== false ? "bg-green-600" : "bg-red-600"}
                        >
                          {u.active !== false ? "Aktív" : "Inaktív"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-yellow-400"
                            onClick={() => setResetPasswordUserId(u.user_id)}
                            title="Jelszó visszaállítás"
                            data-testid={`reset-password-${u.user_id}`}
                          >
                            <Key className="w-4 h-4" />
                          </Button>
                          {u.user_id !== user.user_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={u.active !== false ? "text-slate-400 hover:text-red-400" : "text-slate-400 hover:text-green-400"}
                              onClick={() => handleToggleUserActive(u.user_id)}
                              title={u.active !== false ? "Deaktiválás" : "Aktiválás"}
                              data-testid={`toggle-user-${u.user_id}`}
                            >
                              {u.active !== false ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                            </Button>
                          )}
                        </div>
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
                          onClick={() => setDeleteWorkerId(worker.worker_id)}
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

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUserId} onOpenChange={() => { setResetPasswordUserId(null); setNewPassword(""); }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-yellow-400 flex items-center gap-2">
              <Key className="w-5 h-5" />
              Jelszó visszaállítás
            </DialogTitle>
          </DialogHeader>
          <p className="text-slate-400">
            Új jelszó beállítása: <span className="text-white font-medium">{users.find(u => u.user_id === resetPasswordUserId)?.name}</span>
          </p>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-slate-300">Új jelszó</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white pr-10"
                  placeholder="Minimum 4 karakter"
                  data-testid="reset-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setResetPasswordUserId(null); setNewPassword(""); }} className="border-slate-700">
              Mégse
            </Button>
            <Button onClick={handleResetPassword} className="bg-yellow-600 hover:bg-yellow-500" disabled={!newPassword || newPassword.length < 4}>
              Mentés
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
