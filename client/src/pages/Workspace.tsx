import { useState, useEffect, useCallback, useRef } from "react";
import { Navigate } from 'react-router-dom';
import Sidebar, { type Document } from "../components/Sidebar";
import SummaryCard from "../components/SummaryCard";
import Chat from "./Chat";
import { UploadCloud, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from '../lib/supabase';

// Document interface is imported from Sidebar.tsx

export default function Workspace() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: number;
    const isLocalAuth = localStorage.getItem('isAuthenticated') === 'true';
    const hasHashString = window.location.hash.includes('access_token=');
    
    console.log("Workspace Auth Check - LocalAuth:", isLocalAuth, "HasHash:", hasHashString);
    
    // Safety timer: If Supabase takes > 5s, assume not authenticated for now to unstick UI
    const safetyTimer = setTimeout(() => {
      if (isAuthenticated === null) {
        console.warn("Auth check timed out, defaulting to non-authenticated state.");
        setIsAuthenticated(false);
      }
    }, 5000);

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      clearTimeout(safetyTimer);
      console.log("Supabase Session Result - Session:", !!session, "Error:", error?.message);
      
      const hasErrorHash = window.location.hash.includes('error=');
      if (hasErrorHash) {
        const params = new URLSearchParams(window.location.hash.substring(1));
        const errMsg = params.get('error_description') || params.get('error') || "Unknown OAuth Error";
        setAuthError("Google Login Failed: " + errMsg.replace(/\+/g, ' '));
        return;
      }
      
      if (error) {
        setAuthError(error.message);
        return;
      }
      
      if (!session && hasHashString) {
        // Wait max 10 seconds for the event to fire
        timeoutId = window.setTimeout(() => {
          if (isAuthenticated === null) {
            setAuthError("Auth Timeout: Failed to parse Google Login. This usually means your Supabase VITE_SUPABASE_ANON_KEY is missing or invalid in .env.local.");
          }
        }, 10000);
        return; 
      }
      
      if (session || isLocalAuth) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Supabase Auth State Change Event:", event, "Session:", !!session);
      if (timeoutId) clearTimeout(timeoutId);
      if (safetyTimer) clearTimeout(safetyTimer);
      if (session) {
        setIsAuthenticated(true);
        window.history.replaceState(null, '', window.location.pathname);
      } else if (!hasHashString && !isLocalAuth) {
        setIsAuthenticated(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
      if (safetyTimer) clearTimeout(safetyTimer);
    };
  }, []);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDocId, setActiveDocId] = useState<number | null>(null);
  const [userId, setUserId] = useState<string>('supabase-user-temp'); // Default but updated by auth
  const [isSidebarLoading, setSidebarLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const [summary, setSummary] = useState<any>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update userId when session changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) setUserId(session.user.id);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) setUserId(session.user.id);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  const fetchDocuments = useCallback(async () => {
    try {
      setSidebarLoading(true);
      const token = await getToken();
      const res = await fetch(`/api/documents?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();
      setDocuments(data);
      if (data.length > 0 && !activeDocId) {
        setActiveDocId(data[0].id);
      } else if (data.length === 0) {
        setActiveDocId(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSidebarLoading(false);
    }
  }, [activeDocId, userId]);

  useEffect(() => {
    if (isAuthenticated) fetchDocuments();
  }, [isAuthenticated, fetchDocuments]);

  useEffect(() => {
    if (activeDocId && documents.length > 0) {
      const activeDoc = documents.find(d => d.id === activeDocId);
      if (activeDoc?.metadata?.summary) {
        setSummary(activeDoc.metadata.summary);
      } else {
        setSummary(null);
      }
    } else {
      setSummary(null);
    }
  }, [activeDocId, documents]);

  const handleDelete = async (id: number) => {
    try {
      const token = await getToken();
      await fetch(`http://localhost:3004/api/documents/${id}?userId=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (activeDocId === id) setActiveDocId(null);
      fetchDocuments();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setShowUploadModal(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);
      const token = await getToken();
      
      const response = await fetch('http://localhost:3004/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': userId
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      console.log('Upload success:', data);
      await fetchDocuments();
      setShowUploadModal(false);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      const errorMessage = error.message === 'Failed to fetch' 
        ? 'Network Error: Cannot connect to the backend server. Please ensure the server is running on port 3004.' 
        : (error.message || 'Upload failed. Please check your connection and try again.');
      alert(errorMessage);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSummarize = async () => {
    if (!activeDocId) return;
    setIsSummarizing(true);
    try {
      const token = await getToken();
      const res = await fetch('http://localhost:3004/api/summarize', {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          documentId: activeDocId,
          userId: userId
        })
      });
      if (!res.ok) throw new Error("Summarize failed");
      const data = await res.json();
      setSummary(data);
    } catch (e) {
      console.error(e);
      alert("Summarization failed.");
    } finally {
      setIsSummarizing(false);
    }
  };

  if (isAuthenticated === false) {
    return <Navigate to="/auth" replace />;
  }

  // Prevent flash of UI while checking auth
  if (isAuthenticated === null) {
    if (authError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg max-w-md text-center">
            <h3 className="text-lg font-bold mb-2">Authentication Error</h3>
            <p className="mb-4 text-sm">{authError}</p>
            <button onClick={() => window.location.href = '/auth'} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Back to Login</button>
          </div>
        </div>
      );
    }
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans"><span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="flex h-screen w-full bg-slate-100 overflow-hidden font-sans">
      <Sidebar 
        documents={documents}
        activeDocumentId={activeDocId}
        onSelectDocument={setActiveDocId}
        onDeleteDocument={handleDelete}
        onNewUpload={() => setShowUploadModal(true)}
        isLoading={isSidebarLoading}
      />

      <div className="flex-1 flex flex-col md:flex-row h-full bg-slate-100 overflow-hidden">
        {activeDocId ? (
          <>
            {/* Left Sidebar: Document Insights */}
            <div className="w-full md:w-[400px] lg:w-[450px] flex flex-col border-r bg-white overflow-y-auto p-6 scrollbar-thin">
              <SummaryCard 
                summary={summary} 
                isLoading={isSummarizing} 
                onSummarize={handleSummarize} 
                documentId={activeDocId}
              />
            </div>

            {/* Right Side: Interactive Chat */}
            <div className="flex-1 flex flex-col bg-slate-50 relative">
              <Chat documentId={activeDocId} userId={userId} tokenGetter={getToken} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
            <UploadCloud size={64} className="mb-4 text-slate-300" />
            <h2 className="text-xl font-medium text-slate-600">No Document Selected</h2>
            <p className="mt-2 text-sm max-w-sm text-center">Select a document from the sidebar to start your analysis.</p>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-all font-medium"
            >
              Upload PDF
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showUploadModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full relative"
            >
              {!isUploading && (
                <button 
                  onClick={() => setShowUploadModal(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              )}
              
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  {isUploading ? (
                    <span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                  ) : (
                    <UploadCloud size={32} />
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  {isUploading ? 'Uploading Document...' : 'Upload PDF'}
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  {isUploading ? 'Extracting text and generating AI embeddings. This may take a moment depending on the file size.' : 'Select a PDF or TXT file to add to your knowledge base.'}
                </p>

                {!isUploading && (
                  <>
                    <input 
                      type="file" 
                      accept=".pdf,.txt" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <button 
                      onClick={handleUploadClick}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition shadow-sm"
                    >
                      Browse Files
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
