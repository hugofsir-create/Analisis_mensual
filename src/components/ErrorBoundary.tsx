import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    const { hasError, error } = (this as any).state;
    if (hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-rose-900/20 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Algo salió mal</h2>
              <p className="text-slate-400">
                Hubo un error inesperado al procesar los datos. Esto puede deberse a un formato de archivo no soportado o un error interno.
              </p>
            </div>
            {error && (
              <div className="p-4 bg-slate-950 rounded-xl text-left overflow-auto max-h-32 border border-slate-800">
                <code className="text-xs text-rose-400 font-mono">
                  {error.message || String(error)}
                </code>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recargar Aplicación</span>
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
