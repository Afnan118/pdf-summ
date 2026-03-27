import { useState } from "react";

export default function Admin() {
  const [activeTab, setActiveTab] = useState<"users" | "analytics">("users");

  // Mock data
  const users = [
    { id: "1", name: "Alice Johnson", email: "alice@example.com", uploads: 12, queries: 45 },
    { id: "2", name: "Bob Smith", email: "bob@example.com", uploads: 3, queries: 120 },
    { id: "3", name: "Charlie Davis", email: "charlie@example.com", uploads: 0, queries: 5 },
  ];

  const Analytics = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 border rounded-xl bg-card">
          <p className="text-sm font-medium text-muted-foreground mb-1">Total Users</p>
          <p className="text-3xl font-bold">1,248</p>
          <span className="text-xs text-green-500 font-medium">+12% from last month</span>
        </div>
        <div className="p-6 border rounded-xl bg-card">
          <p className="text-sm font-medium text-muted-foreground mb-1">Total Uploads (MB)</p>
          <p className="text-3xl font-bold">942.5</p>
          <span className="text-xs text-green-500 font-medium">+4% from last month</span>
        </div>
        <div className="p-6 border rounded-xl bg-card">
          <p className="text-sm font-medium text-muted-foreground mb-1">Total AI Queries</p>
          <p className="text-3xl font-bold">45,201</p>
          <span className="text-xs text-green-500 font-medium">+28% from last month</span>
        </div>
      </div>
      <div className="h-64 border rounded-xl flex items-center justify-center bg-muted/20">
        <p className="text-muted-foreground">[Usage Activity Chart Placeholder]</p>
      </div>
    </div>
  );

  return (
    <div className="py-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor system usage and manage users.</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
          Admin Access
        </div>
      </div>

      <div className="border-b mb-6 flex gap-8">
        <button 
          onClick={() => setActiveTab("users")}
          className={`pb-4 border-b-2 font-medium transition-colors ${activeTab === "users" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          User Management
        </button>
        <button 
          onClick={() => setActiveTab("analytics")}
          className={`pb-4 border-b-2 font-medium transition-colors ${activeTab === "analytics" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          System Analytics
        </button>
      </div>

      {activeTab === "users" ? (
        <div className="border rounded-xl overflow-hidden animate-in fade-in">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Uploads</th>
                <th className="px-6 py-4 font-medium">Queries</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y relative">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 font-medium">{u.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{u.email}</td>
                  <td className="px-6 py-4">{u.uploads} files</td>
                  <td className="px-6 py-4">{u.queries} queries</td>
                  <td className="px-6 py-4">
                    <button className="text-primary hover:underline font-medium text-xs">View Data</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Analytics />
      )}
    </div>
  );
}
