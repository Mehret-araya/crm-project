import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import {
  Users,
  TrendingUp,
  UserPlus,
  CheckCircle,
  ArrowUpRight,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  useGetDashboardStats,
  useGetRecentLeads,
  useGetLeadsBySource,
  getGetDashboardStatsQueryKey,
  getGetRecentLeadsQueryKey,
  getGetLeadsBySourceQueryKey,
} from "@workspace/api-client-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/leads/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from "recharts";

const COLORS = ['#F97316', '#3B82F6', '#22C55E', '#8B5CF6', '#EC4899', '#64748B'];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() }
  });
  
  const { data: recentLeads, isLoading: recentLoading } = useGetRecentLeads({
    query: { queryKey: getGetRecentLeadsQueryKey() }
  });
  
  const { data: sources, isLoading: sourcesLoading } = useGetLeadsBySource({
    query: { queryKey: getGetLeadsBySourceQueryKey() }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Leads"
          value={stats?.totalLeads}
          loading={statsLoading}
          icon={Users}
          description="Across all pipelines"
          trend={`${stats?.leadsThisMonth || 0} this month`}
        />
        <StatCard
          title="New Leads"
          value={stats?.newLeads}
          loading={statsLoading}
          icon={UserPlus}
          description="Waiting for contact"
          colorClass="text-blue-500"
        />
        <StatCard
          title="Contacted"
          value={stats?.contactedLeads}
          loading={statsLoading}
          icon={TrendingUp}
          description="In active pipeline"
          colorClass="text-orange-500"
        />
        <StatCard
          title="Conversion Rate"
          value={stats?.conversionRate !== undefined ? `${stats.conversionRate.toFixed(1)}%` : undefined}
          loading={statsLoading}
          icon={CheckCircle}
          description="Overall success"
          colorClass="text-green-500"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Leads */}
        <Card className="col-span-2 shadow-sm border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setLocation("/leads")} className="h-8 text-xs">
              View all
              <ArrowUpRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentLeads && recentLeads.length > 0 ? (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Source</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLeads.map((lead) => (
                      <TableRow key={lead.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="font-medium text-sm">{lead.name}</div>
                          <div className="text-xs text-muted-foreground">{lead.email}</div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={lead.status} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {lead.source}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {format(new Date(lead.createdAt), "MMM d")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border rounded-md border-dashed">
                <Users className="h-10 w-10 mb-4 text-muted/40" />
                <p>No recent activity</p>
                <Button variant="link" onClick={() => setLocation("/leads")} className="mt-2">
                  Add your first lead
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Source Breakdown */}
        <Card className="col-span-1 shadow-sm border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Lead Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[300px]">
            {sourcesLoading ? (
              <Skeleton className="h-[200px] w-[200px] rounded-full" />
            ) : sources && sources.length > 0 ? (
              <div className="w-full h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sources}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="source"
                    >
                      {sources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend 
                      layout="horizontal" 
                      verticalAlign="bottom" 
                      align="center"
                      wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <p>No source data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  loading, 
  icon: Icon, 
  description,
  trend,
  colorClass = "text-foreground"
}: { 
  title: string; 
  value?: string | number; 
  loading: boolean; 
  icon: React.ElementType;
  description?: string;
  trend?: string;
  colorClass?: string;
}) {
  return (
    <Card className="shadow-sm border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 group-hover:-translate-y-1 duration-500">
        <Icon className="h-24 w-24" />
      </div>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${colorClass}`} />
      </CardHeader>
      <CardContent className="relative z-10">
        {loading ? (
          <Skeleton className="h-8 w-24 mt-1" />
        ) : (
          <div className="text-3xl font-bold tracking-tight">
            {value}
          </div>
        )}
        {(description || trend) && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            {trend && <span className="font-medium text-primary bg-primary/10 px-1.5 rounded text-[10px] uppercase tracking-wider">{trend}</span>}
            {description && <span>{description}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
