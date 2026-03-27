import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';

function Home() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <h1 className="text-5xl font-bold tracking-tight text-blue-600 mb-6">AI Customer Support Agent</h1>
      <p className="text-xl text-slate-500 max-w-2xl mb-12 leading-relaxed">
        Upload your PDF and text documents to build a custom knowledge base. Chat with an intelligent AI that answers questions strictly based on your documents.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <button 
          onClick={() => navigate('/auth')}
          className="bg-blue-600 text-white hover:bg-blue-700 px-10 py-4 rounded-full text-lg font-medium transition-all shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-1"
        >
          Sign In to Workspace
        </button>
        <button 
          onClick={() => navigate('/auth')}
          className="bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 px-10 py-4 rounded-full text-lg font-medium transition-all shadow-sm"
        >
          Create Account
        </button>
      </div>
    </div>
  );
}

import Admin from './pages/Admin';
import Workspace from './pages/Workspace';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="text-xl font-bold text-primary flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              RAG AI
            </Link>
            
            <nav className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                {localStorage.getItem('isAuthenticated') ? (
                  <button 
                    onClick={() => {
                      localStorage.removeItem('isAuthenticated');
                      window.location.href = '/';
                    }}
                    className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
                  >
                    Sign Out
                  </button>
                ) : (
                  <Link to="/auth" className="text-sm font-medium hover:text-blue-600 transition-colors">
                    Sign In
                  </Link>
                )}
              </div>
            </nav>
          </div>
        </header>

        <main className="flex-1 container mx-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/workspace" element={
              <div className="fixed inset-0 z-50">
                <Workspace />
              </div>
            } />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
