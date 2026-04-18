import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Users, Database, MessageSquare } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome to your Dashboard</h2>
        <p className="text-muted-foreground">
          Here is an overview of your AI Support Agent's performance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Knowledge Base</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">48 Documents</div>
            <p className="text-xs text-muted-foreground">15MB total size</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+573</div>
            <p className="text-xs text-muted-foreground">+201 since last week</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">System Status</CardTitle>
            <Sparkles className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">Healthy</div>
            <p className="text-xs text-primary/80">All services operational</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              A recap of the most recent interactions with the AI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground italic h-[250px] flex items-center justify-center border-2 border-dashed rounded-lg">
              Chart placeholder...
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Top Referencing Documents</CardTitle>
            <CardDescription>
              Documents most used by the RAG system to generate answers.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="text-sm text-muted-foreground italic h-[250px] flex items-center justify-center border-2 border-dashed rounded-lg">
              List placeholder...
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
