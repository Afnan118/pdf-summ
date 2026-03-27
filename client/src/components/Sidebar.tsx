import { FileText, Trash2, Plus, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';

export interface Document {
  id: number;
  filename: string;
  created_at: string;
  metadata?: {
    summary?: {
      short_summary: string;
      detailed_summary: string;
      key_points: string[];
    };
  };
}

interface SidebarProps {
  documents: Document[];
  activeDocumentId: number | null;
  onSelectDocument: (id: number) => void;
  onDeleteDocument: (id: number) => void;
  onNewUpload: () => void;
  isLoading: boolean;
}

export default function Sidebar({ 
  documents, 
  activeDocumentId, 
  onSelectDocument, 
  onDeleteDocument,
  onNewUpload,
  isLoading
}: SidebarProps) {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('User');

  useEffect(() => {
    // Check supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserEmail(session.user.email || '');
        setUserName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User');
      } else {
        // Fallback to local auth
        setUserEmail(localStorage.getItem('userEmail') || 'user@example.com');
        setUserName(localStorage.getItem('userName') || 'Test User');
      }
    });
  }, []);
  
  const handleSignOut = async () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    await supabase.auth.signOut();
    navigate('/');
  };

  const userInitial = userName.charAt(0).toUpperCase() || 'U';

  return (
    <div className="w-72 bg-slate-50 border-r flex flex-col h-full shrink-0">
      <div className="p-4 border-b">
        <button 
          onClick={onNewUpload}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          New PDF Upload
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">Your Documents</h3>
        
        {isLoading ? (
          <div className="space-y-2 px-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-slate-200 animate-pulse rounded-md"></div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-slate-500 px-2 text-center mt-6">No documents yet.<br/>Upload one to start!</p>
        ) : (
          documents.map(doc => (
            <div 
              key={doc.id}
              onClick={() => onSelectDocument(doc.id)}
              className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                activeDocumentId === doc.id 
                  ? 'bg-blue-100 text-blue-700 font-medium' 
                  : 'hover:bg-slate-200/50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText size={16} className={activeDocumentId === doc.id ? 'text-blue-500' : 'text-slate-400'} />
                <span className="text-sm truncate">{doc.filename}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteDocument(doc.id);
                }}
                className={`p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 ${activeDocumentId === doc.id ? 'text-blue-400 hover:text-red-500' : ''}`}
                title="Delete document"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t bg-white">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
            {userInitial}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-medium text-slate-800 truncate">{userName}</p>
            <p className="text-xs text-slate-500 truncate">{userEmail}</p>
          </div>
          <button 
            onClick={handleSignOut}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
