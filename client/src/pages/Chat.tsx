import { useState, useRef, useEffect } from "react";
import { Send, Plus, History, Trash2 } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  sources?: string[];
  timestamp: number;
  isError?: boolean;
};

type ChatSession = {
  id: string;
  documentId: number;
  title: string;
  messages: Message[];
  updatedAt: number;
};

interface ChatProps {
  documentId: number;
  userId: string; // Add real userId
  tokenGetter: () => Promise<string | null>;
}

export default function Chat({ documentId, userId, tokenGetter }: ChatProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load sessions from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`chat_sessions_${documentId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        }
      } catch (e) {
        console.error("Failed to load chat sessions", e);
      }
    }
  }, [documentId]);

  // Save sessions to LocalStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(`chat_sessions_${documentId}`, JSON.stringify(sessions));
    }
  }, [sessions, documentId]);

  // Current active session
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle New Chat
  const startNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      documentId,
      title: `Conversation ${sessions.length + 1}`,
      messages: [
        { id: "1", role: "ai", content: "Hello! I am your AI support agent. Ask me anything based on your uploaded documents.", timestamp: Date.now() }
      ],
      updatedAt: Date.now()
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
    setShowHistory(false);
  };

  // Handle Delete Chat
  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    if (activeSessionId === id) {
      setActiveSessionId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeSessionId) return;

    const userMessage: Message = { 
      id: Date.now().toString(), 
      role: "user", 
      content: input,
      timestamp: Date.now()
    };

    const aiMessageId = (Date.now() + 1).toString();
    const initialAiMessage: Message = { 
      id: aiMessageId, 
      role: "ai", 
      content: "", 
      timestamp: Date.now() 
    };

    // Update local state and set input immediately
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          updatedAt: Date.now(),
          messages: [...s.messages, userMessage, initialAiMessage]
        };
      }
      return s;
    }));
    setInput("");
    setIsLoading(true);

    try {
      const token = await tokenGetter();
      // Using documentId in body so backend can identify user context without complex headers
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Id': userId
        },
        body: JSON.stringify({ 
          message: userMessage.content,
          history: messages,
          documentId,
          userId // Pass real userId prop
        }),
      });

      if (!response.ok) {
        let errorData = { error: 'Failed to connect to chat API' };
        try { errorData = await response.json(); } catch (e) {}
        
        // Specific handling for 429
        if (response.status === 429) {
           throw new Error('AI_QUOTA_REACHED');
        }
        
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      if (!reader) throw new Error('No reader available');

      let done = false;
      let fullContent = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '');
              if (dataStr === '[DONE]') {
                done = true;
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                
                setSessions(prev => prev.map(s => {
                  if (s.id === activeSessionId) {
                    return {
                      ...s,
                      messages: s.messages.map(msg => {
                        if (msg.id === aiMessageId) {
                          if (parsed.type === 'sources') return { ...msg, sources: parsed.sources };
                          if (parsed.type === 'content') {
                            fullContent += parsed.content;
                            return { ...msg, content: fullContent };
                          }
                        }
                        return msg;
                      })
                    };
                  }
                  return s;
                }));
              } catch (e) {}
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      let errorMsg = `[Backend Error: ${error.message}]`;
      
      if (error.message === 'AI_QUOTA_REACHED') {
        errorMsg = '[AI Quota Limit Reached. Click "Retry" to try again in a moment.]';
      }

      setSessions(prev => prev.map(s => s.id === activeSessionId ? {
        ...s,
        messages: s.messages.map(m => m.id === aiMessageId ? { 
          ...m, 
          content: errorMsg,
          isError: true // New flag for retry button
        } : m)
      } : s));
    } finally {
      setIsLoading(false);
    }
  };

  // Dedicated Retry function
  const handleRetry = (originalMessage: string) => {
    setInput(originalMessage);
    // The form submission logic will handle the rest
    setTimeout(() => {
      const form = document.getElementById('chat-form') as HTMLFormElement;
      form?.requestSubmit();
    }, 50);
  };

  if (!activeSessionId && sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
          <History size={32} />
        </div>
        <h3 className="text-lg font-medium text-slate-700">No Chat History</h3>
        <p className="max-w-xs mt-2 text-sm leading-relaxed">Start a new conversation to begin analyzing this document with AI.</p>
        <button 
          onClick={startNewChat}
          className="mt-6 flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-full font-semibold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
        >
          <Plus size={18} />
          New Chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden relative">
      
      {/* Sidebar Overlay */}
      {showHistory && (
        <div 
          className="absolute inset-0 bg-slate-900/10 backdrop-blur-sm z-20"
          onClick={() => setShowHistory(false)}
        />
      )}

      {/* Internal History Sidebar */}
      <div className={`
        absolute md:relative inset-y-0 left-0 w-64 bg-slate-50 border-r z-30 transition-transform duration-300
        ${showHistory ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${!showHistory && 'md:w-0 md:opacity-0 md:p-0'}
      `}>
        <div className="flex flex-col h-full p-4">
          <button 
            onClick={startNewChat}
            className="flex items-center gap-2 justify-center w-full bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold mb-6 shadow-sm hover:border-blue-200 hover:bg-blue-50 transition-all group"
          >
            <Plus size={18} className="group-hover:scale-110 transition-transform" />
            New Chat
          </button>
          
          <div className="flex-1 overflow-y-auto space-y-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Recent Chats</h3>
            {sessions.map((s) => (
              <div 
                key={s.id}
                onClick={() => { setActiveSessionId(s.id); setShowHistory(false); }}
                className={`
                  group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all
                  ${s.id === activeSessionId ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'hover:bg-white text-slate-600 border border-transparent'}
                `}
              >
                <div className="flex items-center gap-3 truncate">
                  <History size={14} className={s.id === activeSessionId ? 'text-blue-500' : 'text-slate-400'} />
                  <span className="text-sm font-medium truncate">{s.title}</span>
                </div>
                <button 
                  onClick={(e) => deleteSession(s.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-slate-50 relative">
        
        {/* Chat Header */}
        <div className="h-16 px-6 border-b bg-white flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
            >
              <History size={20} />
            </button>
            <div>
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                Ai Chatbot
              </h2>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                {activeSession?.title || 'System'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-full border border-green-100">
              <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-[10px] font-bold text-green-600 uppercase">Live</span>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth scrollbar-thin">
          {messages.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <p className="text-sm font-medium">Ready to discuss this document.</p>
             </div>
          )}
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-4 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`
                w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm
                ${message.role === "user" ? "bg-blue-600 text-white" : "bg-white text-blue-600 border border-slate-100"}
              `}>
                {message.role === "user" ? <div className="font-bold text-xs">Me</div> : <div className="font-bold text-xs">AI</div>}
              </div>
              <div className={`flex flex-col max-w-[85%] ${message.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`
                  px-5 py-4 rounded-2xl shadow-sm text-sm leading-relaxed relative group/msg
                  ${message.role === "user" 
                    ? "bg-blue-600 text-white rounded-tr-none" 
                    : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"}
                `}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.isError && (
                    <button 
                      onClick={() => {
                        const sess = sessions.find(s => s.id === activeSessionId);
                        const msgIdx = sess?.messages.findIndex(m => m.id === message.id) ?? -1;
                        const prevMsg = msgIdx > 0 ? sess?.messages[msgIdx - 1]?.content : "";
                        handleRetry(prevMsg || "");
                      }}
                      className="mt-3 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-white/30"
                    >
                      <Plus size={14} className="rotate-45" />
                      Try Again
                    </button>
                  )}
                </div>
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sources:</span>
                    {message.sources.map((src, i) => (
                      <span key={i} className="text-[10px] bg-slate-100 px-2.5 py-1 rounded-full text-slate-500 font-medium">
                        {src}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shrink-0 text-blue-600">
                <div className="font-bold text-xs">AI</div>
              </div>
              <div className="bg-white border border-slate-100 px-5 py-4 rounded-2xl rounded-tl-none flex flex-col gap-2 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                  AI is analyzing documents...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="p-6 border-t bg-white shrink-0">
          <form id="chat-form" onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-3 items-center">
            
            <div className="relative flex-1 group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your knowledge base..."
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 pr-12 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all shadow-inner"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`
                h-[52px] px-6 bg-blue-600 text-white rounded-2xl flex items-center justify-center 
                hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-300 transition-all font-bold gap-2 shadow-lg shadow-blue-100
              `}
            >
              <span className="hidden sm:inline">Send</span>
              <Send size={18} />
            </button>
          </form>
          <div className="text-center mt-4">
             <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
               AI-Powered Workspace • v2.0
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
