import React, { useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { DeliveryData, processRawData } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: DeliveryData[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      // Use header: "A" to get keys like A, B, C... which matches user's column references
      // range: 1 skips the first row (row 1) as requested by the user
      const data = XLSX.utils.sheet_to_json(ws, { header: "A", raw: true, range: 1 });
      
      // Filter out empty rows to get an accurate count of data rows
      const processedData = data.filter((row: any) => {
        const hasContent = Object.values(row).some(v => v !== null && v !== undefined && v !== '');
        return hasContent;
      });

      const processed = processRawData(processedData);
      onDataLoaded(processed);
    };
    reader.readAsBinaryString(file);
  }, [onDataLoaded]);

  return (
    <div className="w-full max-w-2xl mx-auto p-8 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-900/50 hover:bg-slate-900 transition-colors cursor-pointer relative group">
      <input
        type="file"
        accept=".xlsx, .xls, .csv"
        onChange={handleFileUpload}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      <div className="flex flex-col items-center justify-center space-y-4 text-slate-400">
        <div className="p-4 bg-slate-800 rounded-full shadow-sm group-hover:scale-110 transition-transform border border-slate-700">
          <Upload className="w-8 h-8 text-blue-400" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-200">Importar Datos de Logística</p>
          <p className="text-sm text-slate-500">Arrastra tu archivo Excel o haz clic para buscar</p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-blue-900/30 text-blue-400 px-3 py-1 rounded-full border border-blue-800/50">
          <FileSpreadsheet className="w-3 h-3" />
          <span>Soporta .xlsx, .xls, .csv</span>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-amber-900/20 rounded-lg border border-amber-800/30 flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/70">
          <p className="font-bold mb-1 text-amber-400">Formato sugerido:</p>
          <p>Asegúrate que tu Excel tenga columnas como: "Comprobante", "Fecha Limite", "Fecha Entrega Real", "Tiene Turno".</p>
        </div>
      </div>
    </div>
  );
};
