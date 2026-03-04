import { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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
  Package, 
  Plus, 
  AlertTriangle,
  MapPin,
  Edit
} from "lucide-react";

export const Inventory = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [newItem, setNewItem] = useState({
    product_name: "",
    current_quantity: 0,
    min_level: 0,
    unit: "db",
    location: "Budapest"
  });

  const fetchInventory = async () => {
    try {
      const locationParam = selectedLocation !== "all" ? `?location=${selectedLocation}` : "";
      const response = await axios.get(`${API}/inventory${locationParam}`, { withCredentials: true });
      setInventory(response.data);
    } catch (error) {
      toast.error("Hiba a készlet betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [selectedLocation]);

  const handleCreateItem = async () => {
    try {
      await axios.post(`${API}/inventory`, newItem, { withCredentials: true });
      toast.success("Készlet tétel létrehozva!");
      setIsNewItemOpen(false);
      setNewItem({ product_name: "", current_quantity: 0, min_level: 0, unit: "db", location: "Budapest" });
      fetchInventory();
    } catch (error) {
      toast.error("Hiba a készlet létrehozásakor");
    }
  };

  const handleUpdateQuantity = async (itemId, quantity) => {
    try {
      await axios.put(`${API}/inventory/${itemId}`, { current_quantity: quantity }, { withCredentials: true });
      toast.success("Mennyiség frissítve!");
      fetchInventory();
      setEditingItem(null);
    } catch (error) {
      toast.error("Hiba a mennyiség frissítésekor");
    }
  };

  const lowStockItems = inventory.filter(item => item.current_quantity < item.min_level);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="inventory-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Manrope']">Készlet</h1>
          <p className="text-slate-400 mt-1">{inventory.length} termék összesen</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[150px] bg-slate-900 border-slate-700 text-white">
              <MapPin className="w-4 h-4 mr-2 text-green-400" />
              <SelectValue placeholder="Telephely" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all" className="text-white">Összes</SelectItem>
              <SelectItem value="Budapest" className="text-white">Budapest</SelectItem>
              <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
            </SelectContent>
          </Select>
          
          {user?.role === "admin" && (
            <Dialog open={isNewItemOpen} onOpenChange={setIsNewItemOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-500" data-testid="new-inventory-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Új termék
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle className="text-xl font-['Manrope']">Új készlet tétel</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-slate-300">Termék neve</Label>
                    <Input
                      value={newItem.product_name}
                      onChange={(e) => setNewItem({...newItem, product_name: e.target.value})}
                      className="bg-slate-950 border-slate-700 text-white"
                      placeholder="pl. Autósampon"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Aktuális mennyiség</Label>
                      <Input
                        type="number"
                        value={newItem.current_quantity}
                        onChange={(e) => setNewItem({...newItem, current_quantity: parseFloat(e.target.value) || 0})}
                        className="bg-slate-950 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Minimum szint</Label>
                      <Input
                        type="number"
                        value={newItem.min_level}
                        onChange={(e) => setNewItem({...newItem, min_level: parseFloat(e.target.value) || 0})}
                        className="bg-slate-950 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Egység</Label>
                      <Select value={newItem.unit} onValueChange={(v) => setNewItem({...newItem, unit: v})}>
                        <SelectTrigger className="bg-slate-950 border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                          <SelectItem value="db" className="text-white">db</SelectItem>
                          <SelectItem value="liter" className="text-white">liter</SelectItem>
                          <SelectItem value="kg" className="text-white">kg</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Telephely</Label>
                      <Select value={newItem.location} onValueChange={(v) => setNewItem({...newItem, location: v})}>
                        <SelectTrigger className="bg-slate-950 border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                          <SelectItem value="Budapest" className="text-white">Budapest</SelectItem>
                          <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button 
                    onClick={handleCreateItem}
                    className="w-full bg-green-600 hover:bg-green-500"
                    disabled={!newItem.product_name}
                  >
                    Létrehozás
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Low Stock Warning */}
      {lowStockItems.length > 0 && (
        <Card className="border-red-500/50 bg-red-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <div>
                <p className="text-red-400 font-semibold">Alacsony készlet figyelmeztetés</p>
                <p className="text-slate-400 text-sm">
                  {lowStockItems.length} termék a minimum szint alatt
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {inventory.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nincs készlet adat</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Termék</TableHead>
                    <TableHead className="text-slate-400">Telephely</TableHead>
                    <TableHead className="text-slate-400 text-center">Aktuális</TableHead>
                    <TableHead className="text-slate-400 text-center">Minimum</TableHead>
                    <TableHead className="text-slate-400 text-center">Egység</TableHead>
                    <TableHead className="text-slate-400 text-center">Státusz</TableHead>
                    <TableHead className="text-slate-400 w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => {
                    const isLow = item.current_quantity < item.min_level;
                    const isEditing = editingItem === item.inventory_id;
                    
                    return (
                      <TableRow 
                        key={item.inventory_id}
                        className={`border-slate-800 ${isLow ? 'bg-red-500/5' : 'hover:bg-white/5'}`}
                        data-testid={`inventory-row-${item.inventory_id}`}
                      >
                        <TableCell className="text-white font-medium">{item.product_name}</TableCell>
                        <TableCell className="text-slate-300">
                          <span className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-500" />
                            {item.location}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              defaultValue={item.current_quantity}
                              className="w-20 mx-auto bg-slate-950 border-slate-700 text-white text-center"
                              onBlur={(e) => handleUpdateQuantity(item.inventory_id, parseFloat(e.target.value))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateQuantity(item.inventory_id, parseFloat(e.target.value));
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <span className={`font-semibold ${isLow ? 'text-red-400' : 'text-white'}`}>
                              {item.current_quantity}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-slate-400">{item.min_level}</TableCell>
                        <TableCell className="text-center text-slate-400">{item.unit}</TableCell>
                        <TableCell className="text-center">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                              <AlertTriangle className="w-3 h-3" />
                              Alacsony
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                              OK
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-slate-400 hover:text-white"
                            onClick={() => setEditingItem(isEditing ? null : item.inventory_id)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
