import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { FormularyView } from './components/FormularyView';
import { MedicationDetail } from './components/MedicationDetail';
import { DispensingLog } from './components/DispensingLog';
import { StockManagement } from './components/StockManagement';
import { OfflineSync } from './components/OfflineSync';
import { LoginPage } from './components/LoginPage';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './components/ui/sheet';
import { Pill, ClipboardList, Settings, User, Menu, LogOut } from 'lucide-react';
import { Medication, DispensingRecord, InventoryItem, User as UserType } from './types/medication';
import { MedicationService } from './services/medicationService';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInNetId, setLoggedInNetId] = useState('');
  const [currentView, setCurrentView] = useState<'formulary' | 'detail'>('formulary');
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [dispensingRecords, setDispensingRecords] = useState<DispensingRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [activeTab, setActiveTab] = useState('formulary');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load all data in parallel
        const [medicationsData, dispensingData, inventoryData, usersData] = await Promise.all([
          MedicationService.getAllMedications(),
          MedicationService.getAllDispensingRecords(),
          MedicationService.getAllInventory(),
          MedicationService.getAllUsers()
        ]);

        setMedications(medicationsData);
        setDispensingRecords(dispensingData);
        setInventory(inventoryData);
        setUsers(usersData);

        // Set default user (first pharmacy staff or first user)
        const defaultUser = usersData.find(u => u.role === 'pharmacy_staff') || usersData[0];
        if (defaultUser) {
          setCurrentUser(defaultUser);
        }

        setPendingChanges(0);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data from database. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleLogin = (netId: string) => {
    setLoggedInNetId(netId);
    setIsLoggedIn(true);
    console.log(`User logged in: ${netId}`);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoggedInNetId('');
    setCurrentView('formulary');
    setSelectedMedication(null);
    setActiveTab('formulary');
    console.log('User logged out');
  };

  const handleMedicationSelect = (medication: Medication) => {
    setSelectedMedication(medication);
    setCurrentView('detail');
  };

  const handleBackToFormulary = () => {
    setCurrentView('formulary');
    setSelectedMedication(null);
  };

  const handleDispense = async (record: Omit<DispensingRecord, 'id'>) => {
    try {
      // Create dispensing record in database
      const newRecord = await MedicationService.createDispensingRecord(record);
      setDispensingRecords(prev => [newRecord, ...prev]);

      // Update medication stock locally
      setMedications(prev => prev.map(med => {
        if (med.id === record.medicationId) {
          const newStock = Math.max(0, med.currentStock - record.quantity);
          return {
            ...med,
            currentStock: newStock,
            isAvailable: newStock > 0,
            lastUpdated: new Date()
          };
        }
        return med;
      }));

      // Update inventory locally
      setInventory(prev => prev.map(inv => {
        if (inv.lotNumber === record.lotNumber) {
          return {
            ...inv,
            quantity: Math.max(0, inv.quantity - record.quantity)
          };
        }
        return inv;
      }));

      // Update stock in database
      await MedicationService.updateMedicationStock(
        record.medicationId,
        Math.max(0, medications.find(m => m.id === record.medicationId)?.currentStock || 0) - record.quantity
      );

      setPendingChanges(prev => prev + 1);
    } catch (err) {
      console.error('Error dispensing medication:', err);
      setError('Failed to record dispensing. Please try again.');
    }
  };

  const handleUpdateStock = async (medicationId: string, newQuantity: number, reason: string) => {
    try {
      // Update stock in database
      await MedicationService.updateMedicationStock(medicationId, newQuantity);

      // Update local state
      setMedications(prev => prev.map(med => {
        if (med.id === medicationId) {
          return {
            ...med,
            currentStock: newQuantity,
            isAvailable: newQuantity > 0,
            lastUpdated: new Date()
          };
        }
        return med;
      }));

      setPendingChanges(prev => prev + 1);
    } catch (err) {
      console.error('Error updating stock:', err);
      setError('Failed to update stock. Please try again.');
    }
  };

  const handleSync = async () => {
    // Simulate sync delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    setPendingChanges(0);
  };

  const getAlternatives = (medication: Medication): Medication[] => {
    return medications.filter(med => 
      medication.alternatives.includes(med.id) && med.isAvailable
    );
  };

  const canAccessStockManagement = currentUser?.role === 'pharmacy_staff';

  // User selection component for mobile
  const UserSelector = () => (
    <div className="flex items-center gap-2">
      <User className="size-4 flex-shrink-0" />
      <Select value={currentUser?.id || ''} onValueChange={(value) => {
        const user = users.find(u => u.id === value);
        if (user) setCurrentUser(user);
      }}>
        <SelectTrigger className="w-full min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {users.map(user => (
            <SelectItem key={user.id} value={user.id}>
              <div className="flex items-center gap-2">
                <span className="truncate">{user.name}</span>
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {user.role === 'pharmacy_staff' ? 'Pharmacy' : 'Provider'}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  // Show login page if not logged in
  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading formulary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Settings className="size-8 text-destructive" />
          </div>
          <h1 className="text-lg font-semibold">Connection Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
        {/* Mobile Header */}
        <div className="block sm:hidden mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold truncate">EFWP Formulary</h1>
              <p className="text-sm text-muted-foreground truncate">Mobile Clinic</p>
            </div>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="flex-shrink-0">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>User Settings</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Logged in as:</p>
                    <p className="text-sm text-muted-foreground">{loggedInNetId}</p>
                  </div>
                  <UserSelector />
                  <Button 
                    variant="outline" 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2"
                  >
                    <LogOut className="size-4" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden sm:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">EFWP Medication Formulary</h1>
            <p className="text-muted-foreground">Emory Farmworker Project Mobile Clinic</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{loggedInNetId}</p>
              <p className="text-xs text-muted-foreground">Signed in</p>
            </div>
            <div className="w-48">
              <UserSelector />
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="size-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Offline Sync Status */}
        <div className="mb-4 sm:mb-6">
          <OfflineSync pendingChanges={pendingChanges} onSync={handleSync} />
        </div>

        {/* Main Content */}
        {currentView === 'detail' && selectedMedication ? (
          <MedicationDetail
            medication={selectedMedication}
            alternatives={getAlternatives(selectedMedication)}
            inventory={inventory}
            currentUser={currentUser!}
            onBack={handleBackToFormulary}
            onDispense={handleDispense}
            onSelectAlternative={handleMedicationSelect}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6">
              <TabsTrigger value="formulary" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Pill className="size-3 sm:size-4" />
                <span className="hidden xs:inline">Formulary</span>
                <span className="xs:hidden">Drugs</span>
              </TabsTrigger>
              <TabsTrigger value="log" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <ClipboardList className="size-3 sm:size-4" />
                <span className="hidden xs:inline">Dispensing Log</span>
                <span className="xs:hidden">Log</span>
              </TabsTrigger>
              <TabsTrigger 
                value="stock" 
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                disabled={!canAccessStockManagement}
              >
                <Settings className="size-3 sm:size-4" />
                <span className="hidden sm:inline">Stock Management</span>
                <span className="sm:hidden">Stock</span>
                {!canAccessStockManagement && (
                  <Badge variant="outline" className="text-[10px] sm:text-xs ml-1 hidden sm:inline-flex">
                    Staff Only
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="formulary" className="mt-0">
              <FormularyView
                medications={medications}
                onMedicationSelect={handleMedicationSelect}
              />
            </TabsContent>

            <TabsContent value="log" className="mt-0">
              <DispensingLog records={dispensingRecords} />
            </TabsContent>

            <TabsContent value="stock" className="mt-0">
              {canAccessStockManagement ? (
                <StockManagement
                  medications={medications}
                  currentUser={currentUser!}
                  onUpdateStock={handleUpdateStock}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Settings className="size-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg mb-2">Access Restricted</p>
                  <p className="text-sm">Stock management is available to pharmacy staff only</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
      
      {/* Toaster temporarily disabled to fix import conflicts */}
    </div>
  );
}