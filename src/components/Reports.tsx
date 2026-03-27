import React from 'react';
import { 
  TrendingUp, 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { DeliveryData, calculateStats } from '../types';

interface ReportsProps {
  data: DeliveryData[];
}

export const Reports: React.FC<ReportsProps> = ({ data }) => {
  const stats = calculateStats(data);
  
  // Group by month/week for trends
  const monthlyStats = data.reduce((acc, curr) => {
    const date = curr.fechaEmision !== '-' ? curr.fechaEmision.substring(0, 7) : 'Sin Fecha';
    if (!acc[date]) acc[date] = { total: 0, onTime: 0 };
    acc[date].total += 1;
    if (curr.estado === 'A tiempo') acc[date].onTime += 1;
    return acc;
  }, {} as Record<string, { total: number, onTime: number }>);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-600/10 rounded-2xl">
              <Package className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded-lg flex items-center">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              +12%
            </span>
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium">Volumen Mensual</p>
            <h3 className="text-2xl font-black text-white">{stats.total}</h3>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-600/10 rounded-2xl">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded-lg flex items-center">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              +5.2%
            </span>
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium">Eficiencia OTD</p>
            <h3 className="text-2xl font-black text-white">{stats.onTimeRate.toFixed(1)}%</h3>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-rose-600/10 rounded-2xl">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>
            <span className="text-xs font-bold text-rose-400 bg-rose-900/20 px-2 py-1 rounded-lg flex items-center">
              <ArrowDownRight className="w-3 h-3 mr-1" />
              -2.1%
            </span>
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium">Tasa de Atraso</p>
            <h3 className="text-2xl font-black text-white">{(100 - stats.onTimeRate).toFixed(1)}%</h3>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-purple-600/10 rounded-2xl">
              <Calendar className="w-6 h-6 text-purple-400" />
            </div>
            <span className="text-xs font-bold text-blue-400 bg-blue-900/20 px-2 py-1 rounded-lg flex items-center">
              Estable
            </span>
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium">Uso de Turnos</p>
            <h3 className="text-2xl font-black text-white">{stats.appointmentRate.toFixed(1)}%</h3>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h4 className="font-bold text-slate-100">Resumen por Período</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                <th className="px-6 py-4">Período</th>
                <th className="px-6 py-4">Total Pedidos</th>
                <th className="px-6 py-4">A Tiempo</th>
                <th className="px-6 py-4">OTD %</th>
                <th className="px-6 py-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {Object.entries(monthlyStats).sort().reverse().map(([month, s]) => {
                const periodStats = s as { total: number, onTime: number };
                return (
                  <tr key={month} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-200">{month}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{periodStats.total}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{periodStats.onTime}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-200">
                      {((periodStats.onTime / periodStats.total) * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                        (periodStats.onTime / periodStats.total) > 0.8 ? 'bg-emerald-900/30 text-emerald-400' : 'bg-rose-900/30 text-rose-400'
                      }`}>
                        {(periodStats.onTime / periodStats.total) > 0.8 ? 'Óptimo' : 'Crítico'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
