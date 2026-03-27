import React from 'react';
import { X, Lightbulb, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { DashboardStats } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface SuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: DashboardStats;
}

export const SuggestionsModal: React.FC<SuggestionsModalProps> = ({ isOpen, onClose, stats }) => {
  const getSuggestions = () => {
    const suggestions = [];

    if (stats.onTimeRate < 85) {
      suggestions.push({
        icon: AlertTriangle,
        title: "Mejorar Tasa OTD",
        desc: "Tu tasa de entrega a tiempo es del " + stats.onTimeRate.toFixed(1) + "%. Considera revisar las rutas de entrega para los pedidos sin turno asignado.",
        color: "text-rose-400",
        bg: "bg-rose-900/20"
      });
    } else {
      suggestions.push({
        icon: CheckCircle2,
        title: "Mantener Excelencia",
        desc: "Excelente tasa de cumplimiento. Podrías optimizar aún más reduciendo el tiempo de espera en los clientes con turno.",
        color: "text-emerald-400",
        bg: "bg-emerald-900/20"
      });
    }

    if (stats.appointmentRate < 50) {
      suggestions.push({
        icon: TrendingUp,
        title: "Incrementar Turnos",
        desc: "Solo el " + stats.appointmentRate.toFixed(1) + "% de tus entregas tienen turno. Los turnos garantizan cumplimiento; intenta incentivar a más clientes a programar su cita.",
        color: "text-blue-400",
        bg: "bg-blue-900/20"
      });
    }

    if (stats.promedioAtraso > 2) {
      suggestions.push({
        icon: Lightbulb,
        title: "Reducir Días de Atraso",
        desc: "El atraso promedio es de " + stats.promedioAtraso.toFixed(1) + " días. Analiza si el cuello de botella está en la carga o en el tránsito final.",
        color: "text-amber-400",
        bg: "bg-amber-900/20"
      });
    }

    // Zone-based suggestion
    const zones = Object.entries(stats.statsByZone);
    if (zones.length > 0) {
      const worstZoneEntry = zones.reduce((prev, curr) => {
        const prevStats = prev[1] as { onTimeRate: number };
        const currStats = curr[1] as { onTimeRate: number };
        return prevStats.onTimeRate < currStats.onTimeRate ? prev : curr;
      });
      
      const worstZoneName = worstZoneEntry[0];
      const worstZoneStats = worstZoneEntry[1] as { onTimeRate: number };

      if (worstZoneStats.onTimeRate < 70) {
        suggestions.push({
          icon: AlertTriangle,
          title: `Optimizar Zona: ${worstZoneName}`,
          desc: `La zona ${worstZoneName} tiene el cumplimiento más bajo (${worstZoneStats.onTimeRate.toFixed(1)}%). Revisa si hay problemas de tráfico o falta de recursos en esta área específica.`,
          color: "text-rose-400",
          bg: "bg-rose-900/20"
        });
      }
    }

    return suggestions;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-blue-600/10">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Sugerencias de Optimización</h3>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {getSuggestions().map((s, i) => (
                <div key={i} className="flex items-start space-x-4 p-4 rounded-2xl bg-slate-800/50 border border-slate-800">
                  <div className={`p-3 rounded-xl ${s.bg}`}>
                    <s.icon className={`w-6 h-6 ${s.color}`} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-100">{s.title}</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
              
              <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-center">
                <p className="text-sm text-blue-300">
                  Estas sugerencias se basan en el análisis automático de tus {stats.total} registros actuales.
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-800 bg-slate-900/50">
              <button 
                onClick={onClose}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20"
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
