import React, { useState, useEffect, Component, type ReactNode } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  History, 
  FileSpreadsheet,
  Plus,
  Search,
  Download,
  Upload,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  getDocs
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getDocFromServer, doc } from 'firebase/firestore';
import { db, auth } from '@/src/lib/firebase';
import { Material, Movement, Inventory } from '@/src/types';
import { inventoryService } from '@/src/lib/inventory-service';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: any;
}

class ErrorBoundary extends (Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    const { hasError, errorInfo } = this.state;
    if (hasError) {
      let displayMessage = 'Ha ocurrido un error inesperado.';
      try {
        const errObj = JSON.parse(errorInfo.message);
        if (errObj.error) {
          if (errObj.error.includes('Missing or insufficient permissions')) {
            displayMessage = 'Error de Permisos: No tienes autorización para realizar esta operación. Por favor inicia sesión o contacta al administrador.';
          } else {
            displayMessage = `Error de Base de Datos: ${errObj.error}`;
          }
        }
      } catch (e) {
        displayMessage = errorInfo.message || displayMessage;
      }

      return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 text-center">
          <Card className="max-w-md w-full bg-slate-900 border-slate-800">
            <CardHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-rose-500" />
              </div>
              <CardTitle className="text-white text-xl">¡Ups! Algo salió mal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 mb-6">{displayMessage}</p>
              <Button onClick={() => window.location.reload()} className="w-full bg-blue-600 hover:bg-blue-700">
                Recargar Aplicación
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubMaterials = onSnapshot(collection(db, 'materials'), (snapshot) => {
      setMaterials(snapshot.docs.map(doc => doc.data() as Material));
    });

    const unsubMovements = onSnapshot(
      query(collection(db, 'movements'), orderBy('timestamp', 'desc'), limit(100)), 
      (snapshot) => {
        setMovements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movement)));
      }
    );

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      setInventory(snapshot.docs.map(doc => doc.data() as Inventory));
      setLoading(false);
    });

    return () => {
      unsubMaterials();
      unsubMovements();
      unsubInventory();
    };
  }, []);

  if (loading && showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />
      ) : (
        <div key="main" className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col md:flex-row">
          <Toaster position="top-right" />
          
          {/* Sidebar */}
          <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col shadow-xl">
            <div className="p-6 border-b border-slate-800 flex items-center gap-3">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white">Calico S.A.</span>
            </div>
            
            <nav className="flex-1 p-4 space-y-2">
              <SidebarItem 
                icon={<LayoutDashboard className="w-5 h-5" />} 
                label="Dashboard" 
                active={activeTab === 'dashboard'} 
                onClick={() => setActiveTab('dashboard')} 
              />
              <SidebarItem 
                icon={<Package className="w-5 h-5" />} 
                label="Materiales" 
                active={activeTab === 'materials'} 
                onClick={() => setActiveTab('materials')} 
              />
              <SidebarItem 
                icon={<ArrowDownCircle className="w-5 h-5" />} 
                label="Ingresos" 
                active={activeTab === 'inbound'} 
                onClick={() => setActiveTab('inbound')} 
              />
              <SidebarItem 
                icon={<ArrowUpCircle className="w-5 h-5" />} 
                label="Salidas" 
                active={activeTab === 'outbound'} 
                onClick={() => setActiveTab('outbound')} 
              />
              <SidebarItem 
                icon={<History className="w-5 h-5" />} 
                label="Historial" 
                active={activeTab === 'history'} 
                onClick={() => setActiveTab('history')} 
              />
            </nav>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                  AD
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-slate-200">Administrador</p>
                  <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider font-bold">WMS Manager</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-4 md:p-8 bg-gradient-to-br from-[#0f172a] to-[#1e293b]">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {activeTab === 'dashboard' && <DashboardView inventory={inventory} materials={materials} movements={movements} />}
              {activeTab === 'materials' && <MaterialsView materials={materials} />}
              {activeTab === 'inbound' && <InboundView materials={materials} />}
              {activeTab === 'outbound' && <OutboundView materials={materials} inventory={inventory} />}
              {activeTab === 'history' && <HistoryView movements={movements} />}
            </motion.div>
          </main>
        </div>
      )}
    </AnimatePresence>
  );
}

function SplashScreen({ onComplete }: { onComplete: () => void, key?: string }) {
  return (
    <motion.div 
      className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 overflow-hidden"
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <div className="relative flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 p-8">
        {/* Map and Orbits Container */}
        <div className="relative w-40 h-56 md:w-48 md:h-64 flex items-center justify-center">
          {/* South America Map - Improved Shape */}
          <svg 
            viewBox="0 0 100 150" 
            className="w-full h-full drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <motion.path
              d="M45 5 C55 2 75 10 85 25 C95 40 95 60 85 75 C75 90 65 105 55 125 C50 140 45 150 40 145 C35 140 25 120 15 100 C5 80 0 60 5 40 C10 20 25 10 45 5 Z"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 4, ease: "linear" }}
            />
            <motion.path
              d="M45 5 C55 2 75 10 85 25 C95 40 95 60 85 75 C75 90 65 105 55 125 C50 140 45 150 40 145 C35 140 25 120 15 100 C5 80 0 60 5 40 C10 20 25 10 45 5 Z"
              fill="#f59e0b"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.5, duration: 0.5 }}
            />
          </svg>

          {/* Orbits (Swishes) */}
          <svg 
            viewBox="0 0 200 100" 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220%] h-auto overflow-visible pointer-events-none"
            fill="none"
          >
            {/* Yellow Orbit */}
            <motion.path
              d="M10,60 Q50,10 190,40 Q150,90 10,60"
              stroke="#f59e0b"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0, rotate: -5 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 4, ease: "easeInOut" }}
            />
            {/* Teal Orbit */}
            <motion.path
              d="M5,50 Q40,0 195,50 Q160,100 5,50"
              stroke="#0d9488"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0, rotate: 10 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 4, ease: "easeInOut", delay: 0.3 }}
              onAnimationComplete={onComplete}
            />
          </svg>
        </div>

        {/* Text Container */}
        <div className="flex flex-col items-center md:items-start z-10">
          <motion.h1 
            className="text-6xl md:text-8xl font-black text-white italic tracking-tighter drop-shadow-lg"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 1, ease: "easeOut" }}
          >
            CALICO
          </motion.h1>
          <motion.p 
            className="text-white text-sm md:text-xl font-bold tracking-[0.2em] uppercase -mt-2 md:-mt-4 drop-shadow-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
          >
            LOGISTICA INTEGRAL
          </motion.p>
        </div>
      </div>
      
      <motion.div 
        className="absolute bottom-12 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3 }}
      >
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 bg-amber-500 rounded-full"
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
            />
          ))}
        </div>
        <span className="text-neutral-600 text-[9px] font-mono tracking-widest uppercase">Sistema Calico S.A.</span>
      </motion.div>
    </motion.div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
      }`}
    >
      {icon}
      <span className="font-semibold">{label}</span>
    </button>
  );
}

// --- VIEWS ---

function DashboardView({ inventory, materials, movements }: { inventory: Inventory[], materials: Material[], movements: Movement[] }) {
  const totalApto = inventory.reduce((acc, item) => acc + item.apto, 0);
  const totalNoApto = inventory.reduce((acc, item) => acc + item.noApto, 0);
  const totalItems = totalApto + totalNoApto;

  const exportInventoryToExcel = () => {
    const dataToExport = inventory.map(item => {
      const material = materials.find(m => m.sku === item.materialSku);
      return {
        SKU: item.materialSku,
        Nombre: material?.name || 'N/A',
        Categoría: material?.category || 'N/A',
        Unidad: material?.unit || 'N/A',
        'Cantidad Apto': item.apto,
        'Cantidad No Apto': item.noApto,
        'Total General': item.apto + item.noApto,
        'Última Actualización': item.lastUpdated?.toDate ? item.lastUpdated.toDate().toLocaleString() : 'N/A'
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario Actual");
    XLSX.writeFile(wb, `Inventario_Actual_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-slate-400">Resumen de operaciones logísticas</p>
        </div>
        <Button onClick={exportInventoryToExcel} variant="outline" className="bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-200">
          <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-500" />
          Exportar Inventario
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Inventario" 
          value={totalItems.toLocaleString()} 
          icon={<Package className="text-blue-500" />} 
          description="Unidades totales"
          color="blue"
        />
        <StatCard 
          title="Material Apto" 
          value={totalApto.toLocaleString()} 
          icon={<CheckCircle2 className="text-emerald-500" />} 
          description="Listo para despacho"
          color="emerald"
        />
        <StatCard 
          title="Material No Apto" 
          value={totalNoApto.toLocaleString()} 
          icon={<AlertCircle className="text-rose-500" />} 
          description="Requiere revisión"
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-slate-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-slate-100">Movimientos Recientes</CardTitle>
            <CardDescription className="text-slate-400">Últimas 5 transacciones</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="border-slate-800">
                <TableRow className="hover:bg-transparent border-slate-800">
                  <TableHead className="text-slate-500">Tipo</TableHead>
                  <TableHead className="text-slate-500">Material</TableHead>
                  <TableHead className="text-right text-slate-500">Cant.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.slice(0, 5).map((m) => (
                  <TableRow key={m.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell>
                      <Badge variant={m.type === 'IN' ? 'default' : 'destructive'} className={`uppercase text-[10px] ${m.type === 'IN' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                        {m.type === 'IN' ? 'Ingreso' : 'Salida'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-slate-200">{m.materialName}</TableCell>
                    <TableCell className="text-right font-mono text-slate-300">{m.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-slate-100">Top Materiales</CardTitle>
            <CardDescription className="text-slate-400">Mayor volumen en stock</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inventory
                .sort((a, b) => (b.apto + b.noApto) - (a.apto + a.noApto))
                .slice(0, 5)
                .map((item) => {
                  const material = materials.find(m => m.sku === item.materialSku);
                  const total = item.apto + item.noApto;
                  return (
                    <div key={item.materialSku} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                      <div>
                        <p className="font-medium text-slate-200">{material?.name || item.materialSku}</p>
                        <p className="text-[10px] text-slate-500 font-mono">SKU: {item.materialSku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-400">{total}</p>
                        <p className="text-[10px] text-slate-500 uppercase">{material?.unit}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, description, color }: { title: string, value: string, icon: React.ReactNode, description: string, color: 'blue' | 'emerald' | 'rose' }) {
  const colorMap = {
    blue: 'border-blue-500/20 bg-blue-500/5',
    emerald: 'border-emerald-500/20 bg-emerald-500/5',
    rose: 'border-rose-500/20 bg-rose-500/5'
  };

  return (
    <Card className={`border-slate-800 bg-slate-900 shadow-lg overflow-hidden relative`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${color === 'blue' ? 'bg-blue-500' : color === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
          <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-3xl font-black text-white">{value}</h3>
        </div>
        <p className="text-xs text-slate-500 mt-2 font-medium">{description}</p>
      </CardContent>
    </Card>
  );
}

function MaterialsView({ materials }: { materials: Material[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        let count = 0;
        for (const row of jsonData) {
          // Normalize keys to lowercase and trim
          const normalizedRow: any = {};
          Object.keys(row).forEach(key => {
            normalizedRow[key.toLowerCase().trim()] = row[key];
          });

          // Support common synonyms for headers
          const sku = normalizedRow.sku || normalizedRow.codigo || normalizedRow.id || normalizedRow.sku_material;
          const name = normalizedRow.name || normalizedRow.nombre || normalizedRow.material || normalizedRow.descripcion_material;
          const description = normalizedRow.description || normalizedRow.descripcion || '';
          const category = normalizedRow.category || normalizedRow.categoria || '';
          const unit = normalizedRow.unit || normalizedRow.unidad || 'unidades';

          if (sku && name) {
            await inventoryService.upsertMaterial({
              sku: String(sku).trim(),
              name: String(name).trim(),
              description: String(description).trim(),
              category: String(category).trim(),
              unit: String(unit).trim().toLowerCase()
            });
            count++;
          }
        }
        
        if (count > 0) {
          toast.success(`${count} materiales importados correctamente`);
          setIsImportOpen(false);
        } else {
          toast.error('No se encontraron materiales válidos en el archivo. Verifica las columnas (sku, nombre).');
        }
      } catch (error) {
        console.error(error);
        toast.error('Error al procesar el archivo Excel. Asegúrate de que sea un formato válido.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Maestro de Materiales</h1>
          <p className="text-slate-400">Gestiona el catálogo de productos</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-slate-900 border-slate-700 hover:bg-slate-800">
                <Upload className="w-4 h-4 mr-2 text-blue-400" />
                Importar Excel
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
              <DialogHeader>
                <DialogTitle>Importar Materiales</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Sube un archivo Excel con las columnas: sku, name, description, category, unit.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="excel-file">Archivo Excel</Label>
                  <Input id="excel-file" type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="bg-slate-800 border-slate-700" />
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Material
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
              <DialogHeader>
                <DialogTitle>Agregar Material</DialogTitle>
              </DialogHeader>
              <MaterialForm onSuccess={() => toast.success('Material creado')} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800 shadow-xl">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Buscar por nombre o SKU..." 
              className="pl-10 bg-slate-800 border-slate-700" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="border-slate-800">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-500">SKU</TableHead>
                <TableHead className="text-slate-500">Nombre</TableHead>
                <TableHead className="text-slate-500">Categoría</TableHead>
                <TableHead className="text-slate-500">Unidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((m) => (
                <TableRow key={m.sku} className="border-slate-800 hover:bg-slate-800/50">
                  <TableCell className="font-mono font-medium text-blue-400">{m.sku}</TableCell>
                  <TableCell className="text-slate-200">{m.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-slate-700 text-slate-400">{m.category || 'Sin categoría'}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 uppercase text-[10px] font-bold">{m.unit}</TableCell>
                </TableRow>
              ))}
              {filteredMaterials.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                    No se encontraron materiales.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function MaterialForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    unit: 'unidades'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inventoryService.upsertMaterial(formData);
      onSuccess();
    } catch (error) {
      toast.error('Error al guardar material');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="sku">SKU</Label>
        <Input id="sku" required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="category">Categoría</Label>
        <Input id="category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="unit">Unidad de Medida</Label>
        <Select value={formData.unit} onValueChange={v => setFormData({...formData, unit: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unidades">Unidades</SelectItem>
            <SelectItem value="kg">Kilogramos (kg)</SelectItem>
            <SelectItem value="metros">Metros (m)</SelectItem>
            <SelectItem value="litros">Litros (L)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full">Guardar Material</Button>
    </form>
  );
}

function InboundView({ materials }: { materials: Material[] }) {
  const [isBulk, setIsBulk] = useState(false);
  const [formData, setFormData] = useState({
    materialSku: '',
    materialName: '',
    category: '',
    unit: 'unidades',
    quantity: '',
    status: 'APTO' as 'APTO' | 'NO_APTO',
    referenceNumber: '',
    batch: '',
    expiryDate: '',
    notes: ''
  });

  const isNewMaterial = formData.materialSku && !materials.some(m => m.sku === formData.materialSku);

  // State for bulk lines
  const [bulkLines, setBulkLines] = useState<any[]>([
    { id: Date.now(), materialSku: '', materialName: '', category: '', unit: 'unidades', quantity: '', status: 'APTO', referenceNumber: '', batch: '', expiryDate: '', notes: '', isNew: false }
  ]);

  const addBulkLine = () => {
    setBulkLines([...bulkLines, { id: Date.now(), materialSku: '', materialName: '', category: '', unit: 'unidades', quantity: '', status: 'APTO', referenceNumber: '', batch: '', expiryDate: '', notes: '', isNew: false }]);
  };

  const removeBulkLine = (id: number) => {
    if (bulkLines.length > 1) {
      setBulkLines(bulkLines.filter(line => line.id !== id));
    }
  };

  const updateBulkLine = (id: number, field: string, value: any) => {
    setBulkLines(bulkLines.map(line => {
      if (line.id === id) {
        const updated = { ...line, [field]: value };
        if (field === 'materialSku') {
          const material = materials.find(m => m.sku === value);
          if (material) {
            updated.materialName = material.name;
            updated.category = material.category || '';
            updated.unit = material.unit;
            updated.isNew = false;
          } else {
            updated.isNew = value !== '';
          }
        }
        return updated;
      }
      return line;
    }));
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.materialSku || !formData.quantity || !formData.referenceNumber) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    if (isNewMaterial && !formData.materialName) {
      toast.error('Por favor ingresa el nombre para el nuevo material');
      return;
    }
    
    try {
      if (isNewMaterial) {
        await inventoryService.upsertMaterial({
          sku: formData.materialSku,
          name: formData.materialName,
          category: formData.category,
          unit: formData.unit
        });
      }

      await inventoryService.addMovement({
        type: 'IN',
        materialSku: formData.materialSku,
        materialName: formData.materialName || materials.find(m => m.sku === formData.materialSku)?.name || formData.materialSku,
        quantity: Number(formData.quantity.replace(',', '.')),
        status: formData.status,
        referenceNumber: formData.referenceNumber,
        batch: formData.batch,
        expiryDate: formData.expiryDate,
        notes: formData.notes
      });
      toast.success('Ingreso registrado correctamente');
      setFormData({
        materialSku: '',
        materialName: '',
        category: '',
        unit: 'unidades',
        quantity: '',
        status: 'APTO',
        referenceNumber: '',
        batch: '',
        expiryDate: '',
        notes: ''
      });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error al registrar ingreso');
    }
  };

  const handleBulkSubmit = async () => {
    const validLines = bulkLines.filter(line => line.materialSku && line.quantity && line.referenceNumber);
    
    if (validLines.length === 0) {
      toast.error('No hay líneas completas para procesar');
      return;
    }

    const linesWithNewMaterials = validLines.filter(line => line.isNew);
    for (const line of linesWithNewMaterials) {
      if (!line.materialName) {
        toast.error(`Falta el nombre para el nuevo SKU: ${line.materialSku}`);
        return;
      }
    }

    try {
      // First create any new materials
      for (const line of linesWithNewMaterials) {
        await inventoryService.upsertMaterial({
          sku: line.materialSku,
          name: line.materialName,
          category: line.category,
          unit: line.unit
        });
      }

      const movements = validLines.map(line => {
        return {
          type: 'IN' as const,
          materialSku: line.materialSku,
          materialName: line.materialName || materials.find(m => m.sku === line.materialSku)?.name || line.materialSku,
          quantity: Number(String(line.quantity).replace(',', '.')),
          status: line.status as 'APTO' | 'NO_APTO',
          referenceNumber: line.referenceNumber,
          batch: line.batch,
          expiryDate: line.expiryDate,
          notes: line.notes
        };
      });

      await inventoryService.bulkInbound(movements);
      toast.success(`${movements.length} ingresos procesados correctamente`);
      setBulkLines([{ id: Date.now(), materialSku: '', materialName: '', category: '', unit: 'unidades', quantity: '', status: 'APTO', referenceNumber: '', batch: '', expiryDate: '', notes: '', isNew: false }]);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error al procesar ingresos masivos');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ingreso de Material</h1>
        <p className="text-neutral-400">Registra la entrada de mercancía al almacén</p>
      </div>

      <Tabs value={isBulk ? 'bulk' : 'single'} onValueChange={v => setIsBulk(v === 'bulk')}>
        <TabsList className="grid w-full grid-cols-2 bg-neutral-900">
          <TabsTrigger value="single">Ingreso Individual</TabsTrigger>
          <TabsTrigger value="bulk">Ingreso por Líneas (Masivo)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="single" className="mt-6">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader>
              <CardTitle>Formulario de Ingreso</CardTitle>
              <CardDescription>Completa los datos para registrar una entrada</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSingleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>SKU del Material</Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Ingresa SKU" 
                        className="bg-neutral-800 border-neutral-700"
                        value={formData.materialSku} 
                        onChange={e => {
                          const sku = e.target.value;
                          const material = materials.find(m => m.sku === sku);
                          setFormData({
                            ...formData, 
                            materialSku: sku,
                            materialName: material?.name || '',
                            category: material?.category || '',
                            unit: material?.unit || 'unidades'
                          });
                        }} 
                      />
                      <Select value={formData.materialSku} onValueChange={v => {
                        const material = materials.find(m => m.sku === v);
                        setFormData({
                          ...formData, 
                          materialSku: v,
                          materialName: material?.name || '',
                          category: material?.category || '',
                          unit: material?.unit || 'unidades'
                        });
                      }}>
                        <SelectTrigger className="w-[180px] bg-neutral-800 border-neutral-700">
                          <SelectValue placeholder="O selecciona..." />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-800">
                          {materials.map(m => (
                            <SelectItem key={m.sku} value={m.sku}>{m.sku} - {m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {isNewMaterial && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                        Nuevo Material Detectado
                      </Badge>
                    )}
                  </div>

                  {isNewMaterial ? (
                    <>
                      <div className="space-y-2">
                        <Label>Nombre del Material</Label>
                        <Input 
                          placeholder="Nombre del nuevo material" 
                          className="bg-neutral-800 border-neutral-700"
                          value={formData.materialName} 
                          onChange={e => setFormData({...formData, materialName: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Categoría</Label>
                        <Input 
                          placeholder="Categoría" 
                          className="bg-neutral-800 border-neutral-700"
                          value={formData.category} 
                          onChange={e => setFormData({...formData, category: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unidad</Label>
                        <Select value={formData.unit} onValueChange={v => setFormData({...formData, unit: v})}>
                          <SelectTrigger className="bg-neutral-800 border-neutral-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-900 border-neutral-800">
                            <SelectItem value="unidades">Unidades</SelectItem>
                            <SelectItem value="kg">Kilogramos (kg)</SelectItem>
                            <SelectItem value="metros">Metros (m)</SelectItem>
                            <SelectItem value="litros">Litros (L)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label>Nombre del Material</Label>
                      <Input 
                        readOnly 
                        className="bg-neutral-800/50 border-neutral-700 text-neutral-400"
                        value={formData.materialName} 
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Número de Carga</Label>
                    <Input 
                      placeholder="Ej: CRG-12345" 
                      className="bg-neutral-800 border-neutral-700"
                      value={formData.referenceNumber} 
                      onChange={e => setFormData({...formData, referenceNumber: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Lote</Label>
                    <Input 
                      placeholder="Ej: LOTE-001" 
                      className="bg-neutral-800 border-neutral-700"
                      value={formData.batch} 
                      onChange={e => setFormData({...formData, batch: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Vencimiento</Label>
                    <Input 
                      type="date" 
                      className="bg-neutral-800 border-neutral-700"
                      value={formData.expiryDate} 
                      onChange={e => setFormData({...formData, expiryDate: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cantidad</Label>
                    <Input 
                      type="text" 
                      placeholder="0" 
                      className="bg-neutral-800 border-neutral-700"
                      value={formData.quantity} 
                      onChange={e => setFormData({...formData, quantity: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado de Calidad</Label>
                    <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v as any})}>
                      <SelectTrigger className="bg-neutral-800 border-neutral-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-800">
                        <SelectItem value="APTO">Apto</SelectItem>
                        <SelectItem value="NO_APTO">No Apto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notas / Observaciones</Label>
                  <Input 
                    placeholder="Detalles adicionales..." 
                    className="bg-neutral-800 border-neutral-700"
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                  />
                </div>
                <Button type="submit" className="w-full py-6">Registrar Ingreso</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="mt-6">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Ingreso por Líneas</CardTitle>
                <CardDescription>Agrega múltiples materiales para un ingreso conjunto</CardDescription>
              </div>
              <Button onClick={addBulkLine} variant="outline" size="sm" className="border-neutral-700">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Línea
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="hidden md:grid grid-cols-12 gap-4 px-2 text-xs font-semibold text-neutral-500 uppercase">
                  <div className="col-span-2">SKU</div>
                  <div className="col-span-1">Nombre</div>
                  <div className="col-span-1">Carga</div>
                  <div className="col-span-1">Lote</div>
                  <div className="col-span-2">Vence</div>
                  <div className="col-span-1">Cant.</div>
                  <div className="col-span-1">Estado</div>
                  <div className="col-span-2">Notas</div>
                  <div className="col-span-1"></div>
                </div>
                
                {bulkLines.map((line) => (
                  <div key={line.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-3 bg-neutral-800/50 rounded-lg border border-neutral-800">
                    <div className="col-span-2">
                      <Label className="md:hidden mb-1">SKU</Label>
                      <Input 
                        placeholder="SKU" 
                        className={`bg-neutral-800 border-neutral-700 ${line.isNew ? 'border-amber-500/50' : ''}`}
                        value={line.materialSku} 
                        onChange={e => updateBulkLine(line.id, 'materialSku', e.target.value)} 
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="md:hidden mb-1">Nombre</Label>
                      <Input 
                        placeholder="Nombre" 
                        className={`bg-neutral-800 border-neutral-700 ${line.isNew ? 'bg-amber-500/5' : 'bg-neutral-800/50 text-neutral-400'}`}
                        value={line.materialName} 
                        readOnly={!line.isNew}
                        onChange={e => updateBulkLine(line.id, 'materialName', e.target.value)} 
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="md:hidden mb-1">Carga</Label>
                      <Input 
                        placeholder="Carga" 
                        className="bg-neutral-800 border-neutral-700"
                        value={line.referenceNumber} 
                        onChange={e => updateBulkLine(line.id, 'referenceNumber', e.target.value)} 
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="md:hidden mb-1">Lote</Label>
                      <Input 
                        placeholder="Lote" 
                        className="bg-neutral-800 border-neutral-700"
                        value={line.batch} 
                        onChange={e => updateBulkLine(line.id, 'batch', e.target.value)} 
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="md:hidden mb-1">Vence</Label>
                      <Input 
                        type="date"
                        className="bg-neutral-800 border-neutral-700"
                        value={line.expiryDate} 
                        onChange={e => updateBulkLine(line.id, 'expiryDate', e.target.value)} 
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="md:hidden mb-1">Cant.</Label>
                      <Input 
                        type="text" 
                        placeholder="0" 
                        className="bg-neutral-800 border-neutral-700"
                        value={line.quantity} 
                        onChange={e => updateBulkLine(line.id, 'quantity', e.target.value)} 
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="md:hidden mb-1">Estado</Label>
                      <Select value={line.status} onValueChange={v => updateBulkLine(line.id, 'status', v)}>
                        <SelectTrigger className="bg-neutral-800 border-neutral-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-800">
                          <SelectItem value="APTO">Apto</SelectItem>
                          <SelectItem value="NO_APTO">No Apto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="md:hidden mb-1">Notas</Label>
                      <Input 
                        placeholder="Notas" 
                        className="bg-neutral-800 border-neutral-700"
                        value={line.notes} 
                        onChange={e => updateBulkLine(line.id, 'notes', e.target.value)} 
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-neutral-500 hover:text-red-500"
                        onClick={() => removeBulkLine(line.id)}
                        disabled={bulkLines.length === 1}
                      >
                        <LogOut className="w-4 h-4 rotate-90" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 flex justify-end gap-4">
                <Button variant="outline" onClick={() => setBulkLines([{ id: Date.now(), materialSku: '', materialName: '', category: '', unit: 'unidades', quantity: '', status: 'APTO', referenceNumber: '', batch: '', notes: '', isNew: false }])}>
                  Limpiar Todo
                </Button>
                <Button onClick={handleBulkSubmit} className="px-8">
                  Procesar Todos los Ingresos
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OutboundView({ materials, inventory }: { materials: Material[], inventory: Inventory[] }) {
  const [formData, setFormData] = useState({
    materialSku: '',
    quantity: '',
    status: 'APTO' as 'APTO' | 'NO_APTO',
    referenceNumber: '',
    batch: '',
    expiryDate: '',
    notes: ''
  });

  const selectedStock = inventory.find(i => i.materialSku === formData.materialSku);
  const availableStock = formData.status === 'APTO' ? (selectedStock?.apto || 0) : (selectedStock?.noApto || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.materialSku || !formData.quantity || !formData.referenceNumber) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    const material = materials.find(m => m.sku === formData.materialSku);
    
    try {
      await inventoryService.addMovement({
        type: 'OUT',
        materialSku: formData.materialSku,
        materialName: material?.name || formData.materialSku,
        quantity: Number(formData.quantity.replace(',', '.')),
        status: formData.status,
        referenceNumber: formData.referenceNumber,
        batch: formData.batch,
        expiryDate: formData.expiryDate,
        notes: formData.notes
      });
      toast.success('Salida registrada correctamente');
      setFormData({
        materialSku: '',
        quantity: '',
        status: 'APTO',
        referenceNumber: '',
        batch: '',
        expiryDate: '',
        notes: ''
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al registrar salida');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Salida de Material</h1>
        <p className="text-neutral-500">Registra el despacho de mercancía</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formulario de Salida</CardTitle>
          <CardDescription>Completa los datos para registrar un despacho</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Material</Label>
                <Select value={formData.materialSku} onValueChange={v => setFormData({...formData, materialSku: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un material" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map(m => (
                      <SelectItem key={m.sku} value={m.sku}>{m.name} ({m.sku})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.materialSku && (
                  <p className="text-xs text-neutral-500">
                    Stock disponible: <span className="font-bold">{availableStock}</span>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Número de Salida / Despacho</Label>
                <Input 
                  placeholder="Ej: SAL-98765" 
                  value={formData.referenceNumber} 
                  onChange={e => setFormData({...formData, referenceNumber: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Lote</Label>
                <Input 
                  placeholder="Ej: LOTE-001" 
                  className="bg-neutral-800 border-neutral-700"
                  value={formData.batch} 
                  onChange={e => setFormData({...formData, batch: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha de Vencimiento (Opcional)</Label>
                <Input 
                  type="date"
                  className="bg-neutral-800 border-neutral-700"
                  value={formData.expiryDate} 
                  onChange={e => setFormData({...formData, expiryDate: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Cantidad a Despachar</Label>
                <Input 
                  type="text" 
                  placeholder="0" 
                  className="bg-neutral-800 border-neutral-700"
                  value={formData.quantity} 
                  onChange={e => setFormData({...formData, quantity: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Estado de Calidad</Label>
                <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v as any})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APTO">Apto</SelectItem>
                    <SelectItem value="NO_APTO">No Apto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas / Observaciones</Label>
              <Input 
                placeholder="Destino, cliente, o motivo de salida..." 
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
              />
            </div>
            <Button type="submit" variant="destructive" className="w-full py-6">Registrar Salida</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryView({ movements }: { movements: Movement[] }) {
  const [filter, setFilter] = useState('ALL');

  const filteredMovements = movements.filter(m => {
    if (filter === 'ALL') return true;
    return m.type === filter;
  });

  const exportToExcel = () => {
    const dataToExport = filteredMovements.map(m => ({
      Fecha: m.timestamp?.toDate ? m.timestamp.toDate().toLocaleString() : 'N/A',
      Tipo: m.type === 'IN' ? 'Ingreso' : 'Salida',
      SKU: m.materialSku,
      Material: m.materialName,
      Cantidad: m.quantity,
      Estado: m.status,
      Referencia: m.referenceNumber,
      Lote: m.batch || '',
      Vencimiento: m.expiryDate || '',
      Notas: m.notes || '',
      Usuario: m.createdBy
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial");
    XLSX.writeFile(wb, `Historial_WMS_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Historial de Movimientos</h1>
          <p className="text-neutral-500">Registro detallado de entradas y salidas</p>
        </div>
        <Button onClick={exportToExcel} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar a Excel
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-400" />
            <Tabs value={filter} onValueChange={setFilter} className="w-full">
              <TabsList>
                <TabsTrigger value="ALL">Todos</TabsTrigger>
                <TabsTrigger value="IN">Ingresos</TabsTrigger>
                <TabsTrigger value="OUT">Salidas</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Ref.</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs text-neutral-500">
                      {m.timestamp?.toDate ? m.timestamp.toDate().toLocaleString() : 'Pendiente...'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.type === 'IN' ? 'default' : 'destructive'} className="text-[10px] uppercase">
                        {m.type === 'IN' ? 'Ingreso' : 'Salida'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{m.materialName}</p>
                      <p className="text-[10px] text-neutral-400 font-mono">{m.materialSku}</p>
                    </TableCell>
                    <TableCell className="text-xs font-medium">{m.referenceNumber}</TableCell>
                    <TableCell className="text-xs">{m.batch || '-'}</TableCell>
                    <TableCell className="text-xs">{m.expiryDate || '-'}</TableCell>
                    <TableCell className="text-right font-bold">{m.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={m.status === 'APTO' ? 'outline' : 'secondary'} className={m.status === 'APTO' ? 'text-green-600 border-green-200 bg-green-50' : 'text-red-600 border-red-200 bg-red-50'}>
                        {m.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMovements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-neutral-500">
                      No hay movimientos registrados para este filtro.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
