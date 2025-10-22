import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { AlertTriangle, CheckCircle, Edit, Package, Plus, Search, TrendingDown, TrendingUp, Upload } from 'lucide-react';
import { Medication, User, StockUpdate, InventoryItem } from '../types/medication';
import { BulkImportDialog, ImportedMedicationRow } from './BulkImportDialog';
import { AddLotDialog } from './AddLotDialog';
import { MedicationService } from '../services/medicationService';
// Temporarily disabled problematic sonner import
// import { toast } from 'sonner@2.0.3';

interface StockManagementProps {
  medications: Medication[];
  currentUser: User;
  onUpdateStock: (medicationId: string, newQuantity: number, reason: string) => void;
  onAddLot: (lot: Omit<InventoryItem, 'id' | 'isExpired'>) => Promise<void>;
}

export function StockManagement({ medications, currentUser, onUpdateStock, onAddLot }: StockManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [updateReason, setUpdateReason] = useState('');
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAddLotDialogOpen, setIsAddLotDialogOpen] = useState(false);
  const [selectedMedicationForLot, setSelectedMedicationForLot] = useState<Medication | null>(null);

  const statusOptions = [
    { value: 'all', label: 'All Items' },
    { value: 'low', label: 'Low Stock' },
    { value: 'out', label: 'Out of Stock' },
    { value: 'good', label: 'Good Stock' }
  ];

  const reasonOptions = [
    'Received new shipment',
    'Dispensed to patient',
    'Expired medications removed',
    'Damaged items removed',
    'Inventory count correction',
    'Other'
  ];

  const filteredMedications = useMemo(() => {
    let filtered = medications;

    if (searchTerm) {
      filtered = filtered.filter(med =>
        med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        med.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        med.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(med => {
        switch (statusFilter) {
          case 'low':
            return med.isAvailable && med.currentStock <= med.minStock;
          case 'out':
            return !med.isAvailable;
          case 'good':
            return med.isAvailable && med.currentStock > med.minStock;
          default:
            return true;
        }
      });
    }

    return filtered.sort((a, b) => {
      // Sort by urgency: out of stock first, then low stock, then by name
      if (!a.isAvailable && b.isAvailable) return -1;
      if (a.isAvailable && !b.isAvailable) return 1;
      
      const aLow = a.currentStock <= a.minStock;
      const bLow = b.currentStock <= b.minStock;
      if (aLow && !bLow) return -1;
      if (!aLow && bLow) return 1;
      
      return a.name.localeCompare(b.name);
    });
  }, [medications, searchTerm, statusFilter]);

  const getStockStatus = (medication: Medication) => {
    if (!medication.isAvailable) {
      return { status: 'Out', color: 'destructive', icon: AlertTriangle };
    }
    if (medication.currentStock <= medication.minStock) {
      return { status: 'Low', color: 'secondary', icon: AlertTriangle };
    }
    return { status: 'Good', color: 'default', icon: CheckCircle };
  };

  const handleUpdateStock = () => {
    if (!selectedMedication || !newQuantity || !updateReason) {
      console.log('Please fill in all required fields');
      return;
    }

    const quantity = parseInt(newQuantity);
    if (isNaN(quantity) || quantity < 0) {
      console.log('Please enter a valid quantity');
      return;
    }

    onUpdateStock(selectedMedication.id, quantity, updateReason);
    console.log(`Stock updated for ${selectedMedication.name}`);
    
    setIsUpdateDialogOpen(false);
    setSelectedMedication(null);
    setNewQuantity('');
    setUpdateReason('');
  };

  const openUpdateDialog = (medication: Medication) => {
    setSelectedMedication(medication);
    setNewQuantity(medication.currentStock.toString());
    setIsUpdateDialogOpen(true);
  };

  const handleBulkImport = async (items: ImportedMedicationRow[]) => {
    try {
      // Call the database service to bulk import inventory
      const result = await MedicationService.bulkImportInventory(
        items.map(item => ({
          name: item.name,
          strength: item.strength,
          quantity: item.quantity,
          lotNumber: item.lotNumber,
          expirationDate: item.expirationDate,
          dosageForm: 'tablet' // Default, can be extracted from file if needed
        })),
        '', // siteId - will use default active site
        currentUser.id // userId
      );

      if (result.success > 0) {
        alert(`Successfully imported ${result.success} items!\n${result.failed > 0 ? `Failed: ${result.failed} items` : ''}`);

        // Refresh the page to show updated inventory
        window.location.reload();
      } else {
        alert(`Import failed. ${result.errors.join('\n')}`);
      }
    } catch (error) {
      console.error('Bulk import error:', error);
      alert(`Import failed: ${error}`);
    }
  };

  const lowStockCount = medications.filter(med => med.isAvailable && med.currentStock <= med.minStock).length;
  const outOfStockCount = medications.filter(med => !med.isAvailable).length;
  const totalMedications = medications.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Stock Management</h1>
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            onClick={() => {
              setSelectedMedicationForLot(null);
              setIsAddLotDialogOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="size-4" />
            Add New Lot
          </Button>
          <Button
            variant="default"
            onClick={() => setIsImportDialogOpen(true)}
            className="gap-2"
          >
            <Upload className="size-4" />
            Bulk Import
          </Button>
          <Badge variant="outline" className="text-sm">
            Pharmacy Staff Access
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{outOfStockCount}</p>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="size-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{lowStockCount}</p>
                <p className="text-sm text-muted-foreground">Low Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="size-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{totalMedications}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search medications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stock Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medication</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Min/Max</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMedications.map(medication => {
                  const stockStatus = getStockStatus(medication);
                  const StatusIcon = stockStatus.icon;
                  
                  return (
                    <TableRow key={medication.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{medication.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {medication.strength} • {medication.dosageForm}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {medication.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">
                            {medication.currentStock}
                          </span>
                          {medication.currentStock <= medication.minStock && (
                            <TrendingDown className="size-4 text-orange-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          <span>Min: {medication.minStock}</span>
                          <br />
                          <span>Max: {medication.maxStock}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon className="size-4" />
                          <Badge variant={stockStatus.color as any}>
                            {stockStatus.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {medication.lastUpdated.toLocaleDateString()}
                          <br />
                          {medication.lastUpdated.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openUpdateDialog(medication)}
                        >
                          <Edit className="size-4 mr-1" />
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          {filteredMedications.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="size-12 mx-auto mb-2 opacity-50" />
              <p>No medications found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Stock Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Update Stock - {selectedMedication?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedMedication && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">Current Information</p>
                <p className="text-sm text-muted-foreground">
                  Current Stock: {selectedMedication.currentStock} • 
                  Min: {selectedMedication.minStock} • 
                  Max: {selectedMedication.maxStock}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-quantity">New Quantity *</Label>
                <Input
                  id="new-quantity"
                  type="number"
                  min="0"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Update *</Label>
                <Select value={updateReason} onValueChange={setUpdateReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasonOptions.map(reason => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleUpdateStock} className="flex-1">
                  Update Stock
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsUpdateDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImport={handleBulkImport}
      />

      {/* Add Lot Dialog */}
      <AddLotDialog
        open={isAddLotDialogOpen}
        onOpenChange={setIsAddLotDialogOpen}
        medication={selectedMedicationForLot}
        medications={medications}
        onAddLot={onAddLot}
      />
    </div>
  );
}
