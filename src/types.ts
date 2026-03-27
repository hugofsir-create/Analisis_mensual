import { format, isAfter, parseISO, isValid, differenceInDays } from 'date-fns';

// Helper to safely parse dates from Excel (can be string, number, or undefined)
const safeParseDate = (value: any): Date | null => {
  if (!value) return null;
  
  // If it's already a Date object
  if (value instanceof Date) return isValid(value) ? value : null;
  
  // If it's a number (Excel serial date)
  if (typeof value === 'number') {
    // Excel dates are number of days since 1900-01-01
    // This is a simple conversion, might need adjustment for leap year bug in Excel
    const date = new Date((value - 25569) * 86400 * 1000);
    return isValid(date) ? date : null;
  }
  
  // If it's a string
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Try parseISO first
    try {
      const date = parseISO(trimmed);
      if (isValid(date)) return date;
    } catch (e) {
      // Fallback
    }
    
    // Try DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed
      const year = dmyMatch[3].length === 2 ? 2000 + parseInt(dmyMatch[3], 10) : parseInt(dmyMatch[3], 10);
      const date = new Date(year, month, day);
      if (isValid(date)) return date;
    }

    const date = new Date(trimmed);
    return isValid(date) ? date : null;
  }
  
  return null;
};

export interface DeliveryData {
  id: string;
  comprobante: string;
  fechaEmision: string;
  fechaLimite: string;
  tieneTurno: boolean;
  fechaEntregaReal?: string;
  cliente?: string;
  zona?: string;
  estado: 'A tiempo' | 'Atrasado' | 'Pendiente';
  estadoOriginal?: string;
  diasAtraso: number;
  leadTime: number; // Days between emission and delivery
  originalRow: Record<string, any>;
}

export interface DashboardStats {
  total: number;
  entregados: number;
  aTiempo: number;
  atrasados: number;
  pendientes: number;
  onTimeRate: number;
  deliveryRate: number;
  promedioAtraso: number;
  totalTurnos: number;
  appointmentRate: number;
  statsByZone: Record<string, { 
    total: number; 
    aTiempo: number; 
    atrasados: number; 
    promedioAtraso: number; 
    promedioEntrega: number; // Average lead time
    onTimeRate: number;
  }>;
}

export const processRawData = (raw: any[]): DeliveryData[] => {
  return raw.map((row, index) => {
    // Column Y: Fecha Estimada (Limit)
    const rawFechaLimite = row['Y'] || row['Fecha Estimada'] || row['Fecha Limite'] || row['fecha_limite'] || row['Deadline'] || row['F. Limite'] || row['Vencimiento'];
    // Column AB: Fecha de Entrega (Actual)
    const rawFechaEntrega = row['AB'] || row['Fecha de Entrega'] || row['Fecha Entrega Real'] || row['fecha_entrega_real'] || row['Actual Date'] || row['F. Entrega'] || row['Fecha Real'];
    // Column E: Fecha de Emisión
    const rawFechaEmision = row['E'] || row['Fecha de Emisión'] || row['Fecha de Emision'] || row['Fecha Emision'] || row['fecha_emision'] || row['Emission Date'] || row['F. Emision'] || row['Fecha'];
    
    // Column A: Original Status (User requested states from Column A)
    const rawEstadoA = row['A'];
    
    // Dynamic detection of status column (fallback)
    const statusKey = Object.keys(row).find(k => 
      ['estado', 'status', 'situacion', 'situación', 'situacion_logistica', 'situacion logistica'].some(s => k.toLowerCase().includes(s))
    );
    const estadoOriginal = rawEstadoA ? String(rawEstadoA) : (statusKey ? String(row[statusKey]) : 'N/A');

    // Column Z: Turno
    const rawTurno = row['Z'] || row['Turno'] || row['Tiene Turno'] || row['tiene_turno'] || row['Appointment'] || row['Cita'];
    // Robust check: any non-empty value that doesn't explicitly mean "No"
    const tieneTurno = !!rawTurno && (
      rawTurno === true || 
      (typeof rawTurno === 'number' && rawTurno !== 0) || 
      (typeof rawTurno === 'string' && !['no', 'n', 'false', '0', ''].includes(rawTurno.trim().toLowerCase()))
    );
    
    const cliente = String(row['B'] || row['Cliente'] || row['cliente'] || row['Customer'] || row['Destinatario'] || 'N/A');
    // Column J: Zona
    const zona = String(row['J'] || row['Zona'] || row['Region'] || row['Zone'] || row['Localidad'] || 'Sin Zona');
    
    // If A is status, we might need another column for Comprobante, but we'll keep the fallback chain
    const comprobante = String(row['C'] || row['A'] || row['Comprobante'] || row['comprobante'] || row['Invoice'] || row['Nro'] || row['Documento'] || `INV-${index}`);
    
    const limitDate = safeParseDate(rawFechaLimite);
    const actualDate = safeParseDate(rawFechaEntrega);
    const emissionDate = safeParseDate(rawFechaEmision);
    
    let estado: DeliveryData['estado'] = 'Pendiente';
    let diasAtraso = 0;
    let leadTime = 0;

    // Logic: "A tiempo" if delivered on or before limit (Y) OR if it has a turn (Z)
    if (actualDate && limitDate) {
      if (isAfter(actualDate, limitDate) && !tieneTurno) {
        estado = 'Atrasado';
        diasAtraso = differenceInDays(actualDate, limitDate);
      } else {
        estado = 'A tiempo';
      }
      
      if (emissionDate) {
        leadTime = Math.max(0, differenceInDays(actualDate, emissionDate));
      }
    } else if (!actualDate && limitDate) {
      const today = new Date();
      if (isAfter(today, limitDate) && !tieneTurno) {
        estado = 'Atrasado';
        diasAtraso = differenceInDays(today, limitDate);
      } else {
        // If it's not after limit yet, it's pending
        estado = 'Pendiente';
      }
    }

    return {
      id: String(index),
      comprobante,
      fechaEmision: emissionDate ? format(emissionDate, 'yyyy-MM-dd') : String(rawFechaEmision || '-'),
      fechaLimite: limitDate ? format(limitDate, 'yyyy-MM-dd') : String(rawFechaLimite || '-'),
      tieneTurno,
      fechaEntregaReal: actualDate ? format(actualDate, 'yyyy-MM-dd') : (rawFechaEntrega ? String(rawFechaEntrega) : undefined),
      cliente,
      zona: String(zona),
      estado,
      estadoOriginal,
      diasAtraso,
      leadTime,
      originalRow: row
    };
  });
};

export const calculateStats = (data: DeliveryData[]): DashboardStats => {
  const total = data.length;
  const entregados = data.filter(d => d.fechaEntregaReal).length;
  const aTiempo = data.filter(d => d.estado === 'A tiempo').length;
  const atrasados = data.filter(d => d.estado === 'Atrasado').length;
  const pendientes = data.filter(d => d.estado === 'Pendiente').length;
  
  const deliveredItems = data.filter(d => d.fechaEntregaReal);
  const totalAtraso = deliveredItems.reduce((acc, curr) => acc + curr.diasAtraso, 0);
  const totalTurnos = data.filter(d => d.tieneTurno).length;
  
  // Calculate stats by zone
  const statsByZone: Record<string, { total: number, aTiempo: number, atrasados: number, totalAtraso: number, totalLeadTime: number, deliveredCount: number, promedioAtraso: number, promedioEntrega: number, onTimeRate: number }> = {};
  
  data.forEach(item => {
    const z = item.zona || 'Sin Zona';
    if (!statsByZone[z]) {
      statsByZone[z] = { total: 0, aTiempo: 0, atrasados: 0, totalAtraso: 0, totalLeadTime: 0, deliveredCount: 0, promedioAtraso: 0, promedioEntrega: 0, onTimeRate: 0 };
    }
    statsByZone[z].total += 1;
    if (item.estado === 'A tiempo') statsByZone[z].aTiempo += 1;
    if (item.estado === 'Atrasado') {
      statsByZone[z].atrasados += 1;
      statsByZone[z].totalAtraso += item.diasAtraso;
    }
    if (item.fechaEntregaReal && item.leadTime > 0) {
      statsByZone[z].deliveredCount += 1;
      statsByZone[z].totalLeadTime += item.leadTime;
    }
  });

  // Finalize zone stats
  Object.keys(statsByZone).forEach(z => {
    const s = statsByZone[z];
    s.onTimeRate = s.total > 0 ? (s.aTiempo / s.total) * 100 : 0;
    s.promedioAtraso = s.atrasados > 0 ? s.totalAtraso / s.atrasados : 0;
    s.promedioEntrega = s.deliveredCount > 0 ? s.totalLeadTime / s.deliveredCount : 0;
  });

  return {
    total,
    entregados,
    aTiempo,
    atrasados,
    pendientes,
    onTimeRate: entregados > 0 ? (aTiempo / entregados) * 100 : 0,
    deliveryRate: total > 0 ? (entregados / total) * 100 : 0,
    promedioAtraso: atrasados > 0 ? totalAtraso / atrasados : 0,
    totalTurnos,
    appointmentRate: total > 0 ? (totalTurnos / total) * 100 : 0,
    statsByZone
  };
};
