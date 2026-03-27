import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { DeliveryData, DashboardStats } from '../types';

interface ChartsProps {
  data: DeliveryData[];
  stats: DashboardStats;
}

export const Charts: React.FC<ChartsProps> = ({ data, stats }) => {
  // Data for Pie Chart (Status Distribution from Excel)
  const originalStatusCounts = data.reduce((acc, curr) => {
    const status = curr.estadoOriginal || 'N/A';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const COLORS = ['#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#94a3b8'];

  const statusData = Object.entries(originalStatusCounts).map(([name, value], index) => ({
    name,
    value,
    color: COLORS[index % COLORS.length]
  }));

  // Data for Bar Chart (Appointments vs No Appointments OTD)
  const appointmentData = [
    {
      name: 'Con Turno',
      'A tiempo': data.filter(d => d.tieneTurno && d.estado === 'A tiempo').length,
      'Atrasado': data.filter(d => d.tieneTurno && d.estado === 'Atrasado').length,
    },
    {
      name: 'Sin Turno',
      'A tiempo': data.filter(d => !d.tieneTurno && d.estado === 'A tiempo').length,
      'Atrasado': data.filter(d => !d.tieneTurno && d.estado === 'Atrasado').length,
    }
  ];

  // Data for Delay Distribution
  const delayBuckets = [
    { range: '1-2 días', count: data.filter(d => d.diasAtraso > 0 && d.diasAtraso <= 2).length },
    { range: '3-5 días', count: data.filter(d => d.diasAtraso > 2 && d.diasAtraso <= 5).length },
    { range: '6-10 días', count: data.filter(d => d.diasAtraso > 5 && d.diasAtraso <= 10).length },
    { range: '10+ días', count: data.filter(d => d.diasAtraso > 10).length },
  ].filter(d => d.count > 0);

  // Data for OTD Evolution (by emission date)
  const otdEvolution = Object.entries(
    data.reduce((acc, curr) => {
      const date = curr.fechaEmision !== '-' ? curr.fechaEmision : 'Sin Fecha';
      if (!acc[date]) acc[date] = { total: 0, onTime: 0 };
      acc[date].total += 1;
      if (curr.estado === 'A tiempo') acc[date].onTime += 1;
      return acc;
    }, {} as Record<string, { total: number, onTime: number }>)
  )
    .map(([date, stats]) => ({
      date,
      rate: ((stats as { onTime: number; total: number }).onTime / (stats as { onTime: number; total: number }).total) * 100
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Zone Data for Analysis
  const zoneData = Object.entries(stats.statsByZone).map(([name, s]) => {
    const zoneStats = s as { total: number, onTimeRate: number, promedioAtraso: number, promedioEntrega: number };
    return {
      name,
      total: zoneStats.total,
      otd: zoneStats.onTimeRate,
      delay: zoneStats.promedioAtraso,
      avgDelivery: zoneStats.promedioEntrega
    };
  }).sort((a, b) => b.total - a.total);

  // Top 5 Zones by Delay
  const topDelayZones = Object.entries(stats.statsByZone)
    .map(([name, s]) => {
      const zoneStats = s as { promedioAtraso: number };
      return {
        name,
        delay: zoneStats.promedioAtraso
      };
    })
    .filter(z => z.delay > 0)
    .sort((a, b) => b.delay - a.delay)
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* OTD Evolution */}
      <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 lg:col-span-2">
        <h4 className="text-slate-200 font-semibold mb-6">Evolución de Tasa de Cumplimiento (OTD %)</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={otdEvolution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} unit="%" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
              />
              <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} name="Tasa OTD" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 5 Zones by Delay */}
      <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 lg:col-span-2">
        <h4 className="text-slate-200 font-semibold mb-6">Top 5 Zonas con Mayor Atraso Promedio</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topDelayZones}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} label={{ value: 'Zona', position: 'insideBottom', offset: -5, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} label={{ value: 'Promedio de Atraso (Días)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
              <Tooltip 
                cursor={{fill: '#334155', opacity: 0.4}} 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
              />
              <Bar dataKey="delay" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Días de Atraso Prom." />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Zone Volume & Delivery Time Analysis */}
      <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 lg:col-span-2">
        <h4 className="text-slate-200 font-semibold mb-6">Tiempo Promedio de Entrega y Volumen por Zona</h4>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={zoneData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} label={{ value: 'Volumen', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} label={{ value: 'Días Promedio', angle: 90, position: 'insideRight', fill: '#94a3b8' }} />
              <Tooltip 
                cursor={{fill: '#334155', opacity: 0.4}} 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Volumen Total" />
              <Bar yAxisId="right" dataKey="avgDelivery" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Tiempo Prom. Entrega (Días)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Zone OTD % Analysis */}
      <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 lg:col-span-2">
        <h4 className="text-slate-200 font-semibold mb-6">OTD % por Zona</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={zoneData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} unit="%" />
              <Tooltip 
                cursor={{fill: '#334155', opacity: 0.4}} 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
              />
              <Bar dataKey="otd" fill="#10b981" radius={[4, 4, 0, 0]} name="OTD %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
        <h4 className="text-slate-200 font-semibold mb-6">Distribución de Estados</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                itemStyle={{ color: '#f8fafc' }}
                formatter={(value: number) => {
                  const total = data.length;
                  const percentage = ((value / total) * 100).toFixed(1);
                  return [`${value} (${percentage}%)`, 'Cantidad'];
                }}
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Appointment Impact */}
      <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
        <h4 className="text-slate-200 font-semibold mb-6">Impacto de Turnos en OTD</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={appointmentData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
              <Tooltip 
                cursor={{fill: '#334155', opacity: 0.4}} 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
              />
              <Legend />
              <Bar dataKey="A tiempo" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Atrasado" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
