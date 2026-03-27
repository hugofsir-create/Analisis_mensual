import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Truck } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 3000; // 3 seconds
    const interval = 30; // update every 30ms
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500); // Small delay after 100%
          return 100;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="w-full max-w-md space-y-8 relative">
        {/* Legend */}
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-black text-emerald-500 text-center tracking-widest uppercase"
          style={{ textShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }}
        >
          Calico S.A.
        </motion.h1>

        <div className="relative pt-10">
          {/* Truck Animation */}
          <motion.div 
            className="absolute top-0 left-0 text-emerald-400"
            style={{ left: `${progress}%`, marginLeft: '-24px' }}
            animate={{ 
              y: [0, -2, 0],
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 0.2,
              ease: "linear"
            }}
          >
            <Truck className="w-8 h-8 fill-current" />
            {/* Speed lines */}
            <div className="absolute top-1/2 -left-4 w-3 h-0.5 bg-emerald-500/50 rounded-full" />
            <div className="absolute top-1/3 -left-6 w-4 h-0.5 bg-emerald-500/30 rounded-full" />
          </motion.div>

          {/* Progress Bar Container */}
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700 shadow-inner">
            {/* Progress Bar Fill */}
            <motion.div 
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Percentage */}
          <div className="mt-4 flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            <span>Iniciando Sistemas Logísticos</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* Background decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
    </div>
  );
};
