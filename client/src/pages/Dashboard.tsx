import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user } = useUser();

  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold mb-2">Welcome, {user?.firstName || 'User'}!</h1>
      <p className="text-muted-foreground mb-8">Manage your knowledge base and view recent chats.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Upload Card */}
        <div className="border rounded-lg p-6 flex flex-col items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-primary/10 rounded-full text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
          </div>
          <h3 className="font-semibold text-xl">Upload Documents</h3>
          <p className="text-sm text-muted-foreground">Add new PDFs or text files to your knowledge base.</p>
          <Link to="/upload" className="mt-auto px-4 py-2 bg-primary text-primary-foreground rounded-md w-full text-center hover:bg-primary/90">
            Upload Now
          </Link>
        </div>

        {/* Chat Card */}
        <div className="border rounded-lg p-6 flex flex-col items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-primary/10 rounded-full text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
          </div>
          <h3 className="font-semibold text-xl">Chat with AI</h3>
          <p className="text-sm text-muted-foreground">Ask questions about your uploaded documents.</p>
          <Link to="/chat" className="mt-auto px-4 py-2 bg-secondary text-secondary-foreground rounded-md w-full text-center hover:bg-secondary/80">
            Start Chat
          </Link>
        </div>

        {/* Knowledge Base List summary */}
        <div className="border rounded-lg p-6 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Recent Documents</h3>
            <span className="text-xs font-medium px-2 py-1 bg-muted rounded-full">0 files</span>
          </div>
          <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-md p-4">
            <p className="text-sm text-muted-foreground text-center">No documents uploaded yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
