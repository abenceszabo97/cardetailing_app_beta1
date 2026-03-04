import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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
  Users, 
  Plus, 
  Search, 
  Phone, 
  Car,
  ChevronRight,
  Banknote
} from "lucide-react";

export const Customers = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  
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

  useEffect(() => {
    fetchCustomers();
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
      </div>

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

      {/* Customers Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nincs találat</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Név</TableHead>
                    <TableHead className="text-slate-400">Telefonszám</TableHead>
                    <TableHead className="text-slate-400">Autó</TableHead>
                    <TableHead className="text-slate-400">Rendszám</TableHead>
                    <TableHead className="text-slate-400 text-right">Összes költés</TableHead>
                    <TableHead className="text-slate-400 w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow 
                      key={customer.customer_id}
                      className="border-slate-800 hover:bg-white/5 cursor-pointer"
                      data-testid={`customer-row-${customer.customer_id}`}
                    >
                      <TableCell className="text-white font-medium">{customer.name}</TableCell>
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
                        <Link to={`/customers/${customer.customer_id}`}>
                          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                            <ChevronRight className="w-5 h-5" />
                          </Button>
                        </Link>
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
