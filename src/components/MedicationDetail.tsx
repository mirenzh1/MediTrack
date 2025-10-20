import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertTriangle, CheckCircle, ArrowLeft, Package, Clock, AlertCircle, Plus } from 'lucide-react';
import { Medication, DispensingRecord, InventoryItem, User } from '../types/medication';
// Temporarily disabled problematic sonner import
// import { toast } from 'sonner@2.0.3';

interface MedicationDetailProps {
  medication: Medication;
  alternatives: Medication[];
  inventory: InventoryItem[];
  currentUser: User;
  onBack: () => void;
  onDispense: (record: Omit<DispensingRecord, 'id'>) => void;
  onSelectAlternative: (medication: Medication) => void;
}

export function MedicationDetail({
  medication,
  alternatives,
  inventory,
  currentUser,
  onBack,
  onDispense,
  onSelectAlternative
}: MedicationDetailProps) {
  const [isDispenseDialogOpen, setIsDispenseDialogOpen] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [patientInitials, setPatientInitials] = useState('');
  const [quantity, setQuantity] = useState('');
  const [dose, setDose] = useState('');
  const [selectedLotNumber, setSelectedLotNumber] = useState('');
  const [physicianName, setPhysicianName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [indication, setIndication] = useState('');
  const [notes, setNotes] = useState('');

  const medicationInventory = inventory.filter(inv => inv.medicationId === medication.id);
  const availableLots = medicationInventory.filter(inv => !inv.isExpired && inv.quantity > 0);

  const getStockStatus = () => {
    if (!medication.isAvailable) {
      return { status: 'Out of Stock', color: 'destructive', icon: AlertTriangle };
    }
    if (medication.currentStock <= medication.minStock) {
      return { status: 'Low Stock', color: 'secondary', icon: AlertTriangle };
    }
    return { status: 'In Stock', color: 'default', icon: CheckCircle };
  };

  const handleDispense = () => {
    // Validate required fields
    if (!patientId.trim() || !patientInitials.trim() || !quantity || !dose.trim() ||
        !physicianName.trim() || !indication.trim()) {
      alert('Please fill in all required fields (marked with *)');
      return;
    }

    const quantityNum = parseInt(quantity);
    if (quantityNum <= 0 || quantityNum > medication.currentStock) {
      alert('Invalid quantity');
      return;
    }

    // Use selected lot or generate temporary lot number
    const lotToUse = selectedLotNumber ||
      (availableLots.length > 0 ? availableLots[0].lotNumber : `TEMP-${Date.now().toString().slice(-6)}`);

    const selectedLot = availableLots.find(lot => lot.lotNumber === lotToUse);

    const record: Omit<DispensingRecord, 'id'> = {
      medicationId: medication.id,
      medicationName: `${medication.name} ${medication.strength}`,
      patientId: patientId.trim(),
      patientInitials: patientInitials.trim(),
      quantity: quantityNum,
      dose: dose.trim(),
      lotNumber: lotToUse,
      expirationDate: selectedLot?.expirationDate,
      dispensedBy: currentUser.name,
      physicianName: physicianName.trim(),
      studentName: studentName.trim() || undefined,
      dispensedAt: new Date(),
      indication: indication.trim(),
      notes: notes.trim() || undefined
    };

    onDispense(record);
    console.log('Medication dispensed successfully');
    setIsDispenseDialogOpen(false);

    // Reset form
    setPatientId('');
    setPatientInitials('');
    setQuantity('');
    setDose('');
    setSelectedLotNumber('');
    setPhysicianName('');
    setStudentName('');
    setIndication('');
    setNotes('');
  };

  const stockStatus = getStockStatus();
  const StatusIcon = stockStatus.icon;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{medication.name}</h1>
          <p className="text-muted-foreground">{medication.genericName}</p>
        </div>
      </div>

      {/* Stock Status Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon className="size-5" />
              <div>
                <p className="font-medium">{stockStatus.status}</p>
                <p className="text-sm text-muted-foreground">
                  {medication.currentStock} units available
                </p>
              </div>
            </div>
            
            {medication.isAvailable && (
              <Dialog open={isDispenseDialogOpen} onOpenChange={setIsDispenseDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="size-4 mr-2" />
                    Dispense
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Dispense {medication.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="initials">Patient Initials *</Label>
                      <Input
                        id="initials"
                        placeholder="e.g., J.D."
                        value={patientInitials}
                        onChange={(e) => setPatientInitials(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        max={medication.currentStock}
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Available: {medication.currentStock} units
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="indication">Indication *</Label>
                      <Select value={indication} onValueChange={setIndication}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select indication" />
                        </SelectTrigger>
                        <SelectContent>
                          {medication.commonUses.map(use => (
                            <SelectItem key={use} value={use}>{use}</SelectItem>
                          ))}
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Optional notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                    
                    {availableLots.length > 0 && (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm font-medium mb-1">Lot Information</p>
                        <p className="text-sm text-muted-foreground">
                          Lot: {availableLots[0].lotNumber} • 
                          Exp: {availableLots[0].expirationDate.toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    
                    <Button onClick={handleDispense} className="w-full">
                      Confirm Dispensing
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Medication Details */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Medication Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Strength</Label>
              <p className="text-sm">{medication.strength}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Dosage Form</Label>
              <p className="text-sm">{medication.dosageForm}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Category</Label>
              <Badge variant="outline">{medication.category}</Badge>
            </div>
            <div>
              <Label className="text-sm font-medium">Last Updated</Label>
              <p className="text-sm text-muted-foreground">
                {medication.lastUpdated.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clinical Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Common Uses</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {medication.commonUses.map(use => (
                  <Badge key={use} variant="secondary" className="text-xs">
                    {use}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Contraindications</Label>
              <div className="space-y-1 mt-1">
                {medication.contraindications.map(contra => (
                  <div key={contra} className="flex items-center gap-2">
                    <AlertCircle className="size-3 text-amber-500" />
                    <span className="text-sm">{contra}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Details */}
      {medicationInventory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="size-4" />
              Inventory Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {medicationInventory.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">Lot: {inv.lotNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {inv.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Clock className="size-3" />
                      <span className="text-sm">
                        Exp: {inv.expirationDate.toLocaleDateString()}
                      </span>
                    </div>
                    {inv.isExpired && (
                      <Badge variant="destructive" className="text-xs mt-1">
                        Expired
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alternatives */}
      {(!medication.isAvailable || medication.currentStock <= medication.minStock) && alternatives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alternative Medications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alternatives.map(alt => (
                <div 
                  key={alt.id}
                  className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-muted/50"
                  onClick={() => onSelectAlternative(alt)}
                >
                  <div>
                    <p className="font-medium">{alt.name} {alt.strength}</p>
                    <p className="text-sm text-muted-foreground">{alt.genericName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">{alt.currentStock} available</p>
                    <p className="text-xs text-muted-foreground">Click to view</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}