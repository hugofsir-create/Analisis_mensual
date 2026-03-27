import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp,
  Calendar,
  Search,
  Download,
  Filter,
  RefreshCw,
  MoreVertical,
  ArrowRight
} from 'lucide-react';
import { FileUpload } from './components/FileUpload';
import { KpiCard } from './components/KpiCard';
import { Charts } from './components/Charts';
import { SplashScreen } from './components/SplashScreen';
import { SuggestionsModal } from './components/SuggestionsModal';
import { Reports } from './components/Reports';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster, toast } from 'sonner';
import { DeliveryData, calculateStats } from './types';
import { cn } from './lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [data, setData] = useState<DeliveryData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterZone, setFilterZone] = useState<string>('all');
  const [currentView, setCurrentView] = useState<'dashboard' | 'details' | 'reports'>('dashboard');
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const zones = useMemo(() => {
    const uniqueZones = new Set<string>();
    data.forEach(item => {
      if (item.zona) uniqueZones.add(item.zona);
    });
    return Array.from(uniqueZones).sort();
  }, [data]);

  const allKeys = useMemo(() => {
    if (data.length === 0) return [];
    // Collect all unique keys from all rows to ensure we don't miss any
    const keys = new Set<string>();
    data.forEach(item => {
      Object.keys(item.originalRow).forEach(key => keys.add(key));
    });
    return Array.from(keys);
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = (item.comprobante || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCustomer = (item.cliente || '').toLowerCase().includes(searchCustomer.toLowerCase());
      
      let matchesStatus = filterStatus === 'all' || item.estado === filterStatus;
      if (filterStatus === 'Con Turno') {
        matchesStatus = item.tieneTurno;
      }
      
      const matchesZone = filterZone === 'all' || item.zona === filterZone;
      return matchesSearch && matchesCustomer && matchesStatus && matchesZone;
    });
  }, [data, searchTerm, searchCustomer, filterStatus, filterZone]);

  const stats = useMemo(() => calculateStats(filteredData), [filteredData]);

  const resetData = () => {
    if (window.confirm('¿Estás seguro de que deseas limpiar los datos actuales?')) {
      setData([]);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSearchCustomer('');
    setFilterStatus('all');
    setFilterZone('all');
    toast.success('Filtros limpiados');
  };

  const exportToPDF = async () => {
    const element = document.getElementById('pdf-report-container');
    if (!element) {
      toast.error('No se pudo generar el reporte visual.');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading('Generando Reporte Ejecutivo...');

    try {
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#020617',
        logging: false,
        allowTaint: true,
        windowWidth: 1200
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pageWidth;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }
      
      pdf.save(`LogiTrack-Executive-Report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Reporte PDF generado con éxito', { id: toastId });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Error al generar el reporte visual.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = () => {
    try {
      const toastId = toast.loading('Generando reporte Excel...');
      
      // 1. Prepare Stats Sheet
      const statsData = [
        ['KPI', 'Valor', 'Descripción'],
        ['Total Entregas', stats.total, 'Volumen total de comprobantes'],
        ['A Tiempo', stats.aTiempo, `${stats.onTimeRate.toFixed(1)}% del total entregado`],
        ['Atrasadas', stats.atrasados, `${(100 - stats.onTimeRate).toFixed(1)}% del total entregado`],
        ['Promedio Atraso', `${stats.promedioAtraso.toFixed(1)} días`, 'Días de demora promedio'],
        ['Con Turno', stats.totalTurnos, 'Clientes con cita asignada'],
        ['Tasa de Turnos', `${stats.appointmentRate.toFixed(1)}%`, 'Relación turnos / comprobantes']
      ];

      // 2. Prepare Zone Stats Sheet
      const zoneHeader = ['Zona', 'Total', 'A Tiempo', 'Atrasados', 'OTD %', 'Prom. Atraso (Días)', 'Prom. Entrega (Días)'];
      const zoneRows = Object.entries(stats.statsByZone).map(([name, s]) => {
        const zoneStats = s as { 
          total: number; 
          aTiempo: number; 
          atrasados: number; 
          onTimeRate: number; 
          promedioAtraso: number; 
          promedioEntrega: number; 
        };
        return [
          name,
          zoneStats.total,
          zoneStats.aTiempo,
          zoneStats.atrasados,
          `${zoneStats.onTimeRate.toFixed(1)}%`,
          zoneStats.promedioAtraso.toFixed(1),
          zoneStats.promedioEntrega.toFixed(1)
        ];
      });

      // 3. Prepare Detailed Data Sheet
      const detailedRows = filteredData.map(item => ({
        Comprobante: item.comprobante,
        Cliente: item.cliente,
        Zona: item.zona,
        'Fecha Emisión': item.fechaEmision,
        'Fecha Límite': item.fechaLimite,
        'Fecha Entrega': item.fechaEntregaReal || 'Pendiente',
        Estado: item.estado,
        'Días Atraso': item.diasAtraso,
        'Lead Time (Días)': item.leadTime,
        'Tiene Turno': item.tieneTurno ? 'Sí' : 'No'
      }));

      const wb = XLSX.utils.book_new();
      
      const wsStats = XLSX.utils.aoa_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, wsStats, 'Resumen KPIs');

      const wsZones = XLSX.utils.aoa_to_sheet([zoneHeader, ...zoneRows]);
      XLSX.utils.book_append_sheet(wb, wsZones, 'Análisis por Zona');

      const wsDetails = XLSX.utils.json_to_sheet(detailedRows);
      XLSX.utils.book_append_sheet(wb, wsDetails, 'Detalle Entregas');

      XLSX.writeFile(wb, `LogiTrack-Analytics-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast.success('Excel exportado correctamente', { id: toastId });
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Error al exportar el archivo Excel.');
    }
  };

  const exportFilteredTable = () => {
    try {
      if (filteredData.length === 0) {
        toast.error('No hay datos filtrados para exportar.');
        return;
      }

      const toastId = toast.loading('Exportando tabla filtrada...');
      
      const rows = filteredData.map(item => {
        const row: Record<string, any> = { ...item.originalRow };
        // Add our calculated status and metrics
        row['Estado LogiTrack'] = item.estado;
        row['Días Atraso (Días)'] = item.diasAtraso;
        row['Lead Time (Días)'] = item.leadTime;
        row['Tiene Turno (Cita)'] = item.tieneTurno ? 'SÍ' : 'NO';
        row['Fecha Límite (Sist)'] = item.fechaLimite;
        row['Fecha Entrega (Sist)'] = item.fechaEntregaReal || 'PENDIENTE';
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Listado Filtrado');
      
      XLSX.writeFile(wb, `LogiTrack-Tabla-Filtrada-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(`${filteredData.length} registros exportados`, { id: toastId });
    } catch (error) {
      console.error('Error exporting filtered table:', error);
      toast.error('Error al exportar la tabla.');
    }
  };

  const handleKpiClick = (status: string) => {
    setFilterStatus(status);
    setCurrentView('details');
    // Scroll to top to see the table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getOtdColor = (rate: number) => {
    if (rate < 92) return 'red';
    if (rate < 96) return 'amber';
    return 'green';
  };

  const kpiGrid = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      <div onClick={() => setCurrentView('details')} className="cursor-pointer">
        <KpiCard 
          title="Total Entregas" 
          value={stats.total} 
          icon={Package} 
          color="blue"
          description="Volumen total de comprobantes"
        />
      </div>
      <div onClick={() => handleKpiClick('A tiempo')} className="cursor-pointer">
        <KpiCard 
          title="A Tiempo" 
          value={stats.aTiempo} 
          icon={CheckCircle2} 
          color={getOtdColor(stats.onTimeRate)} 
          description={`${stats.onTimeRate.toFixed(1)}% del total entregado`}
        />
      </div>
      <div onClick={() => handleKpiClick('Atrasado')} className="cursor-pointer">
        <KpiCard 
          title="Atrasadas" 
          value={stats.atrasados} 
          icon={AlertTriangle} 
          color="red"
          description={`${(100 - stats.onTimeRate).toFixed(1)}% del total entregado`}
        />
      </div>
      <div onClick={() => handleKpiClick('Atrasado')} className="cursor-pointer">
        <KpiCard 
          title="Promedio Atraso" 
          value={`${stats.promedioAtraso.toFixed(1)} d`} 
          icon={Clock} 
          color="amber"
          description="Días de demora promedio"
        />
      </div>
      <div onClick={() => handleKpiClick('Con Turno')} className="cursor-pointer">
        <KpiCard 
          title="Con Turno" 
          value={stats.totalTurnos} 
          icon={Calendar} 
          color="purple"
          description="Clientes con cita asignada"
        />
      </div>
      <div onClick={() => handleKpiClick('Con Turno')} className="cursor-pointer">
        <KpiCard 
          title="Tasa de Turnos" 
          value={`${stats.appointmentRate.toFixed(1)}%`} 
          icon={TrendingUp} 
          color="blue"
          description="Relación turnos / comprobantes"
        />
      </div>
    </div>
  );

  const efficiencyInsight = (
    <div className="bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-900/20">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold">Resumen de Eficiencia</h3>
          <p className="text-blue-100 max-w-xl">
            {stats.onTimeRate > 80 
              ? "¡Excelente desempeño! Tu tasa de entrega a tiempo está por encima del promedio del sector." 
              : "Se detectaron oportunidades de mejora. Los atrasos promedio son de " + stats.promedioAtraso.toFixed(1) + " días."}
          </p>
        </div>
        <button 
          onClick={() => setIsSuggestionsOpen(true)}
          className="bg-white text-blue-600 px-6 py-3 rounded-2xl font-bold hover:bg-blue-50 transition-colors flex items-center space-x-2 whitespace-nowrap"
        >
          <span>Ver Sugerencias</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400/20 rounded-full -ml-10 -mb-10 blur-2xl" />
    </div>
  );

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (data.length === 0) {
    return (
      <ErrorBoundary>
        <Toaster position="top-right" theme="dark" richColors />
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
          <div className="max-w-4xl w-full space-y-8">
            <div className="text-center space-y-4">
              <div className="inline-flex p-4 bg-blue-600 rounded-3xl shadow-xl shadow-blue-900/20 mb-4">
                <LayoutDashboard className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight">LogiTrack Analytics</h1>
              <p className="text-slate-400 text-lg max-w-xl mx-auto">
                Analiza el desempeño de tus entregas logísticas. Importa tu reporte de Excel para visualizar KPIs de cumplimiento y detectar cuellos de botella.
              </p>
            </div>
            
            <FileUpload onDataLoaded={setData} />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              {[
                { icon: TrendingUp, title: "On-Time Delivery", desc: "Mide el porcentaje de entregas realizadas antes del límite." },
                { icon: Clock, title: "Análisis de Atrasos", desc: "Identifica cuántos días promedio se retrasan tus pedidos." },
                { icon: Calendar, title: "Impacto de Turnos", desc: "Evalúa si las entregas con turno son más eficientes." }
              ].map((feature, i) => (
                <div key={i} className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                  <feature.icon className="w-6 h-6 text-blue-400 mb-3" />
                  <h3 className="font-bold text-slate-100 mb-1">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Toaster position="top-right" theme="dark" richColors />
      <div className="min-h-screen bg-slate-950 flex text-slate-100">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-slate-800 flex-col p-6 sticky top-0 h-screen">
        <div className="flex items-center space-x-3 mb-10">
          <div className="p-2 bg-blue-600 rounded-lg">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">LogiTrack</span>
        </div>

        <nav className="flex-1 space-y-1">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={cn(
              "flex items-center space-x-3 w-full p-3 rounded-xl font-medium transition-colors",
              currentView === 'dashboard' ? "bg-blue-600/10 text-blue-400" : "text-slate-400 hover:bg-slate-800"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </button>
          <button 
            onClick={() => setCurrentView('details')}
            className={cn(
              "flex items-center space-x-3 w-full p-3 rounded-xl font-medium transition-colors",
              currentView === 'details' ? "bg-blue-600/10 text-blue-400" : "text-slate-400 hover:bg-slate-800"
            )}
          >
            <Package className="w-5 h-5" />
            <span>Detalle de Entregas</span>
          </button>
          <button 
            onClick={() => setCurrentView('reports')}
            className={cn(
              "flex items-center space-x-3 w-full p-3 rounded-xl font-medium transition-colors",
              currentView === 'reports' ? "bg-blue-600/10 text-blue-400" : "text-slate-400 hover:bg-slate-800"
            )}
          >
            <TrendingUp className="w-5 h-5" />
            <span>Reportes</span>
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <button 
            onClick={resetData}
            className="flex items-center space-x-3 w-full p-3 text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors font-medium"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Limpiar Datos</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-10 space-y-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-white">
              {currentView === 'dashboard' ? 'Panel de Control' : currentView === 'details' ? 'Detalle de Entregas' : 'Reportes Ejecutivos'}
            </h2>
            <p className="text-slate-400">Visualizando {data.length} registros logísticos</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
              <select 
                value={filterZone}
                onChange={(e) => setFilterZone(e.target.value)}
                className="pl-10 pr-8 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer hover:bg-slate-800 transition-all min-w-[160px] text-sm"
              >
                <option value="all">Todas las Zonas</option>
                {zones.map(zone => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </select>
            </div>
            <div className="relative group">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-10 pr-8 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer hover:bg-slate-800 transition-all min-w-[160px] text-sm"
              >
                <option value="all">Todos los Estados</option>
                <option value="A tiempo">A tiempo</option>
                <option value="Atrasado">Atrasado</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Con Turno">Con Turno</option>
              </select>
            </div>
            <button 
              onClick={clearFilters}
              className="flex items-center space-x-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors text-sm"
              title="Limpiar todos los filtros"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Limpiar Filtros</span>
            </button>
            <button 
              onClick={exportToExcel}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600/10 border border-emerald-500/30 rounded-xl text-emerald-400 hover:bg-emerald-600/20 transition-colors shadow-sm text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>
            <button 
              onClick={exportToPDF}
              disabled={isExporting}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50 text-sm"
            >
              <Download className={cn("w-4 h-4", isExporting && "animate-bounce")} />
              <span>{isExporting ? 'Exportando...' : 'Exportar PDF'}</span>
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Actualizar</span>
            </button>
          </div>
        </header>

        <div id="dashboard-content" className="space-y-8">
          {currentView === 'dashboard' ? (
            <>
              {/* KPI Grid */}
              {kpiGrid}

              {/* Charts Section */}
              <Charts data={data} stats={stats} />

              {/* Insights Section */}
              {efficiencyInsight}
            </>
          ) : currentView === 'details' ? (
            /* Data Table Section */
            <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <h4 className="font-bold text-slate-100">Listado Maestro de Comprobantes</h4>
                  <button 
                    onClick={exportFilteredTable}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-600/10 border border-emerald-500/30 rounded-lg text-emerald-400 hover:bg-emerald-600/20 transition-colors text-xs font-bold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar Vista Actual</span>
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Buscar comprobante..."
                      className="pl-10 pr-4 py-2 bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 w-full md:w-64 text-slate-100 placeholder:text-slate-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Filtrar por cliente..."
                      className="pl-10 pr-4 py-2 bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 w-full md:w-64 text-slate-100 placeholder:text-slate-500"
                      value={searchCustomer}
                      onChange={(e) => setSearchCustomer(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800/50 text-slate-500 text-xs uppercase tracking-wider">
                      {allKeys.map(key => (
                        <th key={key} className="px-6 py-4 font-semibold whitespace-nowrap">{key}</th>
                      ))}
                      <th className="px-6 py-4 font-semibold whitespace-nowrap">Cumplimiento (App)</th>
                      <th className="px-6 py-4 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredData.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/50 transition-colors group">
                        {allKeys.map(key => (
                          <td key={key} className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap">
                            {item.originalRow[key] !== undefined ? String(item.originalRow[key]) : '-'}
                          </td>
                        ))}
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium",
                            item.estado === 'A tiempo' && "bg-emerald-900/30 text-emerald-400 border border-emerald-800/50",
                            item.estado === 'Atrasado' && "bg-rose-900/30 text-rose-400 border border-rose-800/50",
                            item.estado === 'Pendiente' && "bg-amber-900/30 text-amber-400 border border-amber-800/50"
                          )}>
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full mr-1.5",
                              item.estado === 'A tiempo' && "bg-emerald-500",
                              item.estado === 'Atrasado' && "bg-rose-500",
                              item.estado === 'Pendiente' && "bg-amber-500"
                            )} />
                            {item.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-1 hover:bg-slate-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-4 h-4 text-slate-500" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredData.length === 0 && (
                <div className="p-20 text-center space-y-3">
                  <div className="inline-flex p-4 bg-slate-800 rounded-full">
                    <Search className="w-8 h-8 text-slate-700" />
                  </div>
                  <p className="text-slate-500 font-medium">No se encontraron resultados para tu búsqueda</p>
                </div>
              )}
            </div>
          ) : (
            <Reports data={data} />
          )}
        </div>

        <SuggestionsModal 
          isOpen={isSuggestionsOpen} 
          onClose={() => setIsSuggestionsOpen(false)} 
          stats={stats} 
        />

        {/* Hidden Executive Report for PDF Export */}
        <div className="absolute -left-[9999px] top-0" aria-hidden="true">
          <div id="pdf-report-container" className="w-[1200px] bg-slate-950 p-12 space-y-10">
            <div className="flex items-center justify-between border-b border-slate-800 pb-8">
              <div>
                <h1 className="text-4xl font-black text-white tracking-tight">LogiTrack Analytics</h1>
                <p className="text-slate-400 text-lg mt-1">Reporte Ejecutivo de Desempeño Logístico</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500 uppercase tracking-widest font-bold">Fecha de Generación</p>
                <p className="text-2xl font-bold text-blue-400">{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-300 flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-blue-500" />
                Indicadores Clave de Desempeño (KPIs)
              </h2>
              {kpiGrid}
            </div>

            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-300 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Análisis Gráfico y Tendencias
              </h2>
              <Charts data={data} stats={stats} />
            </div>
            
            <div className="pt-8 border-t border-slate-800">
              <div className="bg-blue-600/10 border border-blue-500/20 rounded-3xl p-8 text-white">
                <h3 className="text-2xl font-bold text-blue-400 mb-2">Conclusión del Análisis</h3>
                <p className="text-slate-300 text-lg leading-relaxed">
                  {stats.onTimeRate > 80 
                    ? "El sistema registra un nivel de cumplimiento óptimo. Se recomienda mantener las estrategias actuales de despacho y monitoreo de rutas." 
                    : "Se requiere atención inmediata en los procesos de última milla. El atraso promedio de " + stats.promedioAtraso.toFixed(1) + " días impacta directamente en la satisfacción del cliente."}
                </p>
              </div>
            </div>

            <div className="text-center text-slate-600 text-sm pt-10">
              Este reporte fue generado automáticamente por LogiTrack Analytics.
            </div>
          </div>
        </div>
      </main>
    </div>
    </ErrorBoundary>
  );
}
