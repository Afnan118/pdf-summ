 import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar Placeholder */}
      <aside className="w-64 border-r bg-background/50 backdrop-blur-xl hidden md:block">
        <div className="p-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-primary">AI</span> Support
          </h2>
        </div>
        <nav className="p-4 space-y-2">
           <div className="px-4 py-2 bg-primary/10 text-primary rounded-md text-sm font-medium">
             Overview
           </div>
           <div className="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-md text-sm font-medium text-muted-foreground transition-colors cursor-pointer">
             Knowledge Base
           </div>
           <div className="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-md text-sm font-medium text-muted-foreground transition-colors cursor-pointer">
             Chat Interface
           </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b bg-background/50 backdrop-blur-xl flex items-center justify-between px-6">
           <h1 className="font-semibold">Dashboard</h1>
           <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">{user.email}</div>
           </div>
        </header>
        <div className="flex-1 overflow-auto p-6 text-zinc-900 dark:text-zinc-100">
          {children}
        </div>
      </main>
    </div>
  );
}
