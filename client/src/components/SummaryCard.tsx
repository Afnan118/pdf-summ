import { motion } from 'framer-motion';

interface SummaryCardProps {
  summary: {
    short_summary: string;
    detailed_summary: string;
    key_points: string[];
  } | null;
  isLoading: boolean;
  onSummarize: () => void;
  documentId: number | null;
}

export default function SummaryCard({ summary, isLoading, onSummarize, documentId }: SummaryCardProps) {
  if (!documentId) return null;

  return (
    <div className="bg-white border-b shadow-sm w-full z-10 shrink-0">
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Insights
            </h2>
            {isLoading && (
              <span className="text-xs text-blue-500 font-medium flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-full animate-pulse">
                <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Working...
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            {!summary && !isLoading && (
              <button
                onClick={onSummarize}
                className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-semibold transition-all shadow-md shadow-blue-100"
              >
                Generate Executive Summary
              </button>
            )}
            {summary && !isLoading && (
              <button
                onClick={onSummarize}
                className="text-[10px] text-slate-400 hover:text-blue-500 uppercase tracking-widest font-bold flex items-center gap-1 transition-colors"
                title="Regenerate summary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                Regenerate
              </button>
            )}
          </div>
        </div>

        {summary && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6"
          >
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">EXECUTIVE SUMMARY</h3>
                <p className="text-sm font-medium text-slate-700 leading-relaxed">{summary.short_summary}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Detailed Overview</h3>
                <p className="text-sm text-slate-600 leading-relaxed text-justify">{summary.detailed_summary}</p>
              </div>
            </div>
 
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl shadow-sm">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Key Points</h3>
                <ul className="space-y-3">
                  {summary.key_points.map((point, i) => (
                    <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-blue-500 mt-1 shrink-0 font-bold">•</span>
                      <span className="leading-tight">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
