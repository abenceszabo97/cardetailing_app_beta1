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
  Edit,
  Trash2,
  Save,
  X
} from "lucide-react";

export const Inventory = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [deleteItemId, setDeleteItemId] = useState(null);
  
  const [newItem, setNewItem] = useState({
    product_name: "",
    current_quantity: 0,
    min_level: 0,
    unit: "db",
    location: "Debrecen"
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
      setNewItem({ product_name: "", current_quantity: 0, min_level: 0, unit: "db", location: "Debrecen" });
      fetchInventory();
    } catch (error) {
      toast.error("Hiba a készlet létrehozásakor");
    }
  };

  const handleStartEdit = (item) => {
    setEditingItem(item.inventory_id);
    setEditForm({
      product_name: item.product_name,
      current_quantity: item.current_quantity,
      min_level: item.min_level,
      unit: item.unit,
      location: item.location
    });
  };

  const handleSaveEdit = async (itemId) => {
    try {
      await axios.put(`${API}/inventory/${itemId}`, editForm, { withCredentials: true });
      toast.success("Készlet tétel frissítve!");
      setEditingItem(null);
      setEditForm(null);
      fetchInventory();
    } catch (error) {
      toast.error("Hiba a mentés során");
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditForm(null);
  };

  const handleDelete = async (itemId) => {
    try {
      await axios.delete(`${API}/inventory/${itemId}`, { withCredentials: true });
      toast.success("Termék törölve!");
      fetchInventory();
      setDeleteItemId(null);
    } catch (error) {
      toast.error("Hiba a törlés során");
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
    <div className="space-y-4 sm:space-y-6" data-testid="inventory-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Manrope']">Készlet</h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">{inventory.length} termék összesen</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-full sm:w-[150px] bg-slate-900 border-slate-700 text-white text-sm">
              <MapPin className="w-4 h-4 mr-2 text-green-400" />
              <SelectValue placeholder="Telephely" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all" className="text-white">Összes</SelectItem>
              <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
              <SelectItem value="Budapest" className="text-white">Budapest</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={isNewItemOpen} onOpenChange={setIsNewItemOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-500 w-full sm:w-auto" data-testid="new-inventory-btn">
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
                      data-testid="new-inventory-name"
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
                        data-testid="new-inventory-quantity"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Minimum szint</Label>
                      <Input
                        type="number"
                        value={newItem.min_level}
                        onChange={(e) => setNewItem({...newItem, min_level: parseFloat(e.target.value) || 0})}
                        className="bg-slate-950 border-slate-700 text-white"
                        data-testid="new-inventory-min"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Egység</Label>
                      <Select value={newItem.unit} onValueChange={(v) => setNewItem({...newItem, unit: v})}>
                        <SelectTrigger className="bg-slate-950 border-slate-700" data-testid="new-inventory-unit">
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
                        <SelectTrigger className="bg-slate-950 border-slate-700" data-testid="new-inventory-location">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                          <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
                          <SelectItem value="Budapest" className="text-white">Budapest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button 
                    onClick={handleCreateItem}
                    className="w-full bg-green-600 hover:bg-green-500"
                    disabled={!newItem.product_name}
                    data-testid="create-inventory-submit"
                  >
                    Létrehozás
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
                  {lowStockItems.length} termék a minimum szint alatt: {lowStockItems.map(i => i.product_name).join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Table/Cards */}
      <Card className="glass-card">
        <CardContent className="p-0 sm:p-0">
          {inventory.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nincs készlet adat</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3 p-4">
                {inventory.map((item) => {
                  const isLow = item.current_quantity < item.min_level;
                  return (
                    <div 
                      key={item.inventory_id}
                      className={`p-4 rounded-xl border ${isLow ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700 bg-slate-800/50'}`}
                      data-testid={`inventory-card-${item.inventory_id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-white font-semibold">{item.product_name}</h3>
                          <p className="text-slate-400 text-xs flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" /> {item.location}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-white" onClick={() => startEdit(item)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-red-400" onClick={() => setDeleteItemId(item.inventory_id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-900/50 rounded-lg p-2">
                          <p className="text-[10px] text-slate-500">Aktuális</p>
                          <p className={`text-lg font-bold ${isLow ? 'text-red-400' : 'text-white'}`}>{item.current_quantity}</p>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-2">
                          <p className="text-[10px] text-slate-500">Minimum</p>
                          <p className="text-lg font-bold text-slate-400">{item.min_level}</p>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-2">
                          <p className="text-[10px] text-slate-500">Egység</p>
                          <p className="text-lg font-bold text-slate-300">{item.unit}</p>
                        </div>
                      </div>
                      {isLow && (
                        <div className="mt-2 flex items-center gap-1 text-red-400 text-xs">
                          <AlertTriangle className="w-3 h-3" /> Alacsony készlet
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Termék</TableHead>
                    <TableHead className="text-slate-400">Telephely</TableHead>
                    <TableHead className="text-slate-400 text-center">Aktuális</TableHead>
                    <TableHead className="text-slate-400 text-center">Minimum</TableHead>
                    <TableHead className="text-slate-400 text-center">Egység</TableHead>
                    <TableHead className="text-slate-400 text-center">Státusz</TableHead>
                    <TableHead className="text-slate-400 text-right">Műveletek</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => {
                    const isLow = item.current_quantity < item.min_level;
                    const isEditing = editingItem === item.inventory_id;
                    
                    return (
                      <TableRow
                        key={item.inventory_id}
                        className={`border-slate-800 ${isLow ? 'bg-red-500/10 border-l-2 border-l-red-500' : 'hover:bg-white/5'}`}
                        data-testid={`inventory-row-${item.inventory_id}`}
                      >
                        <TableCell className="text-white font-medium">
                          {isEditing ? (
                            <Input
                              value={editForm.product_name}
                              onChange={(e) => setEditForm({...editForm, product_name: e.target.value})}
                              className="w-40 bg-slate-950 border-slate-700 text-white"
                            />
                          ) : (
                            <span className="flex items-center gap-2">
                              {isLow && <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                              {item.product_name}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {isEditing ? (
                            <Select value={editForm.location} onValueChange={(v) => setEditForm({...editForm, location: v})}>
                              <SelectTrigger className="w-32 bg-slate-950 border-slate-700">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-700">
                                <SelectItem value="Budapest" className="text-white">Budapest</SelectItem>
                                <SelectItem value="Debrecen" className="text-white">Debrecen</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-slate-500" />
                              {item.location}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editForm.current_quantity}
                              onChange={(e) => setEditForm({...editForm, current_quantity: parseFloat(e.target.value) || 0})}
                              className="w-20 mx-auto bg-slate-950 border-slate-700 text-white text-center"
                            />
                          ) : (
                            <span className={`font-semibold ${isLow ? 'text-red-400' : 'text-white'}`}>
                              {item.current_quantity}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editForm.min_level}
                              onChange={(e) => setEditForm({...editForm, min_level: parseFloat(e.target.value) || 0})}
                              className="w-20 mx-auto bg-slate-950 border-slate-700 text-white text-center"
                            />
                          ) : (
                            <span className="text-slate-400">{item.min_level}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Select value={editForm.unit} onValueChange={(v) => setEditForm({...editForm, unit: v})}>
                              <SelectTrigger className="w-20 mx-auto bg-slate-950 border-slate-700">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-700">
                                <SelectItem value="db" className="text-white">db</SelectItem>
                                <SelectItem value="liter" className="text-white">liter</SelectItem>
                                <SelectItem value="kg" className="text-white">kg</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-slate-400">{item.unit}</span>
                          )}
                        </TableCell>
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
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-green-400 hover:text-green-300"
                                onClick={() => handleSaveEdit(item.inventory_id)}
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-slate-400 hover:text-white"
                                onClick={handleCancelEdit}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-slate-400 hover:text-white"
                                onClick={() => handleStartEdit(item)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-slate-400 hover:text-red-400"
                                  onClick={() => setDeleteItemId(item.inventory_id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Termék törlése</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400">Biztosan törölni szeretnéd ezt a terméket?</p>
          <p className="text-white font-medium">{inventory.find(i => i.inventory_id === deleteItemId)?.product_name}</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteItemId(null)} className="border-slate-700">
              Mégse
            </Button>
            <Button variant="destructive" onClick={() => handleDelete(deleteItemId)} className="bg-red-600 hover:bg-red-700">
              Törlés
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
