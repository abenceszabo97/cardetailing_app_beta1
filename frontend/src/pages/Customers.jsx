import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  Users, 
  Plus, 
  Search, 
  Phone, 
  Car,
  ChevronRight,
  Banknote,
  Ban,
  Trash2,
  UserX,
  AlertTriangle
} from "lucide-react";

export const Customers = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("customers");
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [removeFromBlacklistId, setRemoveFromBlacklistId] = useState(null);
  const [deleteCustomerId, setDeleteCustomerId] = useState(null);
  
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    car_type: "",
    plate_number: ""
  });

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`, { withCredentials: true });
      setCustomers(response.data);
      setFilteredCustomers(response.data);
    } catch (error) {
      toast.error("Hiba az ügyfelek betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  const fetchBlacklist = async () => {
    try {
      const response = await axios.get(`${API}/blacklist`, { withCredentials: true });
      setBlacklist(response.data);
    } catch (error) {
      toast.error("Hiba a tiltólista betöltésekor");
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchBlacklist();
  }, []);

  useEffect(() => {
    const filtered = customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
    );
    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

  const handleCreateCustomer = async () => {
    try {
      await axios.post(`${API}/customers`, newCustomer, { withCredentials: true });
      toast.success("Ügyfél sikeresen létrehozva!");
      setIsNewCustomerOpen(false);
      setNewCustomer({ name: "", phone: "", car_type: "", plate_number: "" });
      fetchCustomers();
    } catch (error) {
      toast.error("Hiba az ügyfél létrehozásakor");
    }
  };

  const handleRemoveFromBlacklist = async (plateNumber) => {
    try {
      await axios.delete(`${API}/blacklist/${encodeURIComponent(plateNumber)}`, { withCredentials: true });
      toast.success("Eltávolítva a tiltólistáról");
      fetchBlacklist();
      setRemoveFromBlacklistId(null);
    } catch (error) {
      toast.error("Hiba az eltávolításkor");
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    try {
      await axios.delete(`${API}/customers/${customerId}`, { withCredentials: true });
      toast.success("Ügyfél sikeresen törölve!");
      fetchCustomers();
      setDeleteCustomerId(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba az ügyfél törlésekor");
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
    <div className="space-y-6" data-testid="customers-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Manrope']">Ügyfelek</h1>
          <p className="text-slate-400 mt-1">{customers.length} ügyfél összesen</p>
        </div>
        {activeTab === "customers" && (
          <Dialog open={isNewCustomerOpen} onOpenChange={setIsNewCustomerOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-500" data-testid="new-customer-btn">
                <Plus className="w-4 h-4 mr-2" />
                Új ügyfél
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle className="text-xl font-['Manrope']">Új ügyfél hozzáadása</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-slate-300">Név</Label>
                  <Input
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                    className="bg-slate-950 border-slate-700 text-white"
                    placeholder="Teljes név"
                    data-testid="new-customer-name"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Telefonszám</Label>
                  <Input
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    className="bg-slate-950 border-slate-700 text-white"
                    placeholder="+36 30 123 4567"
                    data-testid="new-customer-phone"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Autó típusa</Label>
                  <Input
                    value={newCustomer.car_type}
                    onChange={(e) => setNewCustomer({...newCustomer, car_type: e.target.value})}
                    className="bg-slate-950 border-slate-700 text-white"
                    placeholder="pl. BMW X5"
                    data-testid="new-customer-car-type"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Rendszám</Label>
                  <Input
                    value={newCustomer.plate_number}
                    onChange={(e) => setNewCustomer({...newCustomer, plate_number: e.target.value.toUpperCase()})}
                    className="bg-slate-950 border-slate-700 text-white"
                    placeholder="ABC-123"
                    data-testid="new-customer-plate"
                  />
                </div>
                <Button 
                  onClick={handleCreateCustomer}
                  className="w-full bg-green-600 hover:bg-green-500"
                  disabled={!newCustomer.name || !newCustomer.phone || !newCustomer.plate_number}
                  data-testid="create-customer-submit"
                >
                  Létrehozás
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("customers")}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium flex items-center gap-2 transition-colors ${
            activeTab === "customers" 
              ? "bg-slate-800 text-white border-b-2 border-green-500" 
              : "text-slate-400 hover:text-white"
          }`}
          data-testid="tab-customers"
        >
          <Users className="w-4 h-4" />
          Ügyfelek
          <Badge className="bg-slate-700 text-xs">{customers.length}</Badge>
        </button>
        <button
          onClick={() => setActiveTab("blacklist")}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium flex items-center gap-2 transition-colors ${
            activeTab === "blacklist" 
              ? "bg-slate-800 text-white border-b-2 border-orange-500" 
              : "text-slate-400 hover:text-white"
          }`}
          data-testid="tab-blacklist"
        >
          <Ban className="w-4 h-4" />
          Tiltólista
          {blacklist.length > 0 && (
            <Badge className="bg-orange-500/20 text-orange-400 text-xs">{blacklist.length}</Badge>
          )}
        </button>
      </div>

      {/* Customers Tab */}
      {activeTab === "customers" && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Keresés név, rendszám vagy telefonszám alapján..."
              className="pl-10 bg-slate-900 border-slate-700 text-white"
              data-testid="customer-search"
            />
          </div>

          {/* Customers List */}
          <Card className="glass-card">
            <CardContent className="p-0">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nincs találat</p>
                </div>
              ) : (
                <>
                  {/* Mobile: Card Layout */}
                  <div className="md:hidden divide-y divide-slate-800">
                    {filteredCustomers.map((customer) => (
                      <Link 
                        key={customer.customer_id}
                        to={`/customers/${customer.customer_id}`}
                        className="block p-4 hover:bg-white/5 transition-colors"
                        data-testid={`customer-card-${customer.customer_id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-semibold flex items-center gap-2">
                            {customer.name}
                            {customer.blacklisted && (
                              <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                                <Ban className="w-3 h-3 mr-1" /> Tiltólistán
                              </Badge>
                            )}
                          </span>
                          <span className="text-green-400 font-semibold text-sm">
                            {(customer.total_spent || 0).toLocaleString()} Ft
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {customer.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Car className="w-3 h-3" /> {customer.car_type || "-"}
                          </span>
                          <span className="font-mono text-white text-xs">{customer.plate_number}</span>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Desktop: Table Layout */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-800 hover:bg-transparent">
                          <TableHead className="text-slate-400">Név</TableHead>
                          <TableHead className="text-slate-400">Telefonszám</TableHead>
                          <TableHead className="text-slate-400">Autó</TableHead>
                          <TableHead className="text-slate-400">Rendszám</TableHead>
                          <TableHead className="text-slate-400 text-right">Összes költés</TableHead>
                          <TableHead className="text-slate-400 w-24">Műveletek</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCustomers.map((customer) => (
                          <TableRow 
                            key={customer.customer_id}
                            className="border-slate-800 hover:bg-white/5 cursor-pointer"
                            data-testid={`customer-row-${customer.customer_id}`}
                          >
                            <TableCell className="text-white font-medium">
                              <span className="flex items-center gap-2">
                                {customer.name}
                                {customer.blacklisted && (
                                  <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                                    <Ban className="w-3 h-3" />
                                  </Badge>
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="text-slate-300">
                              <span className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-slate-500" />
                                {customer.phone}
                              </span>
                            </TableCell>
                            <TableCell className="text-slate-300">
                              <span className="flex items-center gap-2">
                                <Car className="w-4 h-4 text-slate-500" />
                                {customer.car_type || "-"}
                              </span>
                            </TableCell>
                            <TableCell className="text-white font-mono font-bold">{customer.plate_number}</TableCell>
                            <TableCell className="text-right">
                              <span className="flex items-center justify-end gap-2 text-green-400 font-semibold">
                                <Banknote className="w-4 h-4" />
                                {(customer.total_spent || 0).toLocaleString()} Ft
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Link to={`/customers/${customer.customer_id}`}>
                                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" title="Részletek">
                                    <ChevronRight className="w-5 h-5" />
                                  </Button>
                                </Link>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-slate-400 hover:text-red-400" 
                                  title="Törlés"
                                  onClick={(e) => { e.stopPropagation(); setDeleteCustomerId(customer.customer_id); }}
                                  data-testid={`delete-customer-${customer.customer_id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Blacklist Tab */}
      {activeTab === "blacklist" && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <UserX className="w-5 h-5 text-orange-400" />
              Tiltólista
            </CardTitle>
          </CardHeader>
          <CardContent>
            {blacklist.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Ban className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nincs tiltólistán szereplő ügyfél</p>
                <p className="text-sm mt-2">A naptárból lehet ügyfelet a tiltólistára helyezni.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {blacklist.map((entry) => (
                  <div 
                    key={entry.blacklist_id}
                    className="p-4 bg-slate-800/50 rounded-xl border border-orange-500/20 flex items-center justify-between"
                    data-testid={`blacklist-entry-${entry.plate_number}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-white font-bold text-lg">{entry.plate_number}</span>
                        {entry.customer_name && (
                          <span className="text-slate-400">{entry.customer_name}</span>
                        )}
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-400">{entry.reason}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        Hozzáadta: {entry.added_by_name || "Ismeretlen"} - {new Date(entry.created_at).toLocaleDateString("hu-HU")}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-slate-700 text-slate-400 hover:text-white hover:border-red-500"
                      onClick={() => setRemoveFromBlacklistId(entry.plate_number)}
                      data-testid={`remove-blacklist-${entry.plate_number}`}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Eltávolítás
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Remove from Blacklist Confirmation */}
      <Dialog open={!!removeFromBlacklistId} onOpenChange={() => setRemoveFromBlacklistId(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-orange-400">Eltávolítás a tiltólistáról</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400">Biztosan eltávolítod ezt a rendszámot a tiltólistáról?</p>
          <p className="text-white font-mono font-bold">{removeFromBlacklistId}</p>
          <p className="text-slate-500 text-sm">Az ügyfél újra tud majd időpontot foglalni.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRemoveFromBlacklistId(null)} className="border-slate-700">
              Mégse
            </Button>
            <Button onClick={() => handleRemoveFromBlacklist(removeFromBlacklistId)} className="bg-green-600 hover:bg-green-700">
              Eltávolítás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Customer Confirmation */}
      <Dialog open={!!deleteCustomerId} onOpenChange={() => setDeleteCustomerId(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Ügyfél törlése
            </DialogTitle>
          </DialogHeader>
          <p className="text-slate-400">Biztosan törölni szeretnéd ezt az ügyfelet?</p>
          <p className="text-white font-medium">
            {customers.find(c => c.customer_id === deleteCustomerId)?.name}
          </p>
          <p className="text-slate-500 font-mono text-sm">
            {customers.find(c => c.customer_id === deleteCustomerId)?.plate_number}
          </p>
          <p className="text-red-400/70 text-sm mt-2">
            Ez a művelet nem visszavonható!
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteCustomerId(null)} className="border-slate-700">
              Mégse
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleDeleteCustomer(deleteCustomerId)} 
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-customer"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Törlés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
