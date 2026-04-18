import { useState } from "react";
import { format } from "date-fns";
import { 
  Plus, 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  MoreHorizontal,
  Edit,
  Trash2,
  Globe,
  ArrowUpDown,
  Inbox
} from "lucide-react";
import {
  GetLeadsStatus,
  GetLeadsSort,
  Lead,
  LeadStatus,
  useGetLeads,
  useDeleteLead,
  useUpdateLeadStatus,
  getGetLeadsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { StatusBadge } from "@/components/leads/status-badge";
import { LeadCard } from "@/components/leads/lead-card";
import { LeadForm } from "@/components/leads/lead-form";

export default function Leads() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [view, setView] = useState<"table" | "card">("table");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<GetLeadsStatus | "All">("All");
  const [sort, setSort] = useState<GetLeadsSort>(GetLeadsSort.newest);
  const [page, setPage] = useState(1);
  const limit = 12;

  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; lead: Lead | null }>({
    open: false,
    lead: null
  });

  const deleteLead = useDeleteLead();
  const updateStatus = useUpdateLeadStatus();

  // Query parameters
  const queryParams = {
    page,
    limit,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(statusFilter !== "All" ? { status: statusFilter as GetLeadsStatus } : {}),
    ...(sort ? { sort } : {}),
  };

  const { data, isLoading } = useGetLeads(queryParams, {
    query: {
      queryKey: getGetLeadsQueryKey(queryParams),
      keepPreviousData: true,
    }
  });

  const invalidateList = () => {
    queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey() });
  };

  const handleDelete = () => {
    if (!deleteDialog.lead) return;
    
    deleteLead.mutate(
      { id: deleteDialog.lead.id },
      {
        onSuccess: () => {
          toast({ title: "Lead deleted successfully" });
          invalidateList();
          setDeleteDialog({ open: false, lead: null });
        },
        onError: () => {
          toast({ title: "Failed to delete lead", variant: "destructive" });
        }
      }
    );
  };

  const handleStatusChange = (id: number, status: LeadStatus) => {
    updateStatus.mutate(
      { id, data: { status: status as any } },
      {
        onSuccess: () => {
          toast({ title: `Status updated` });
          invalidateList();
        }
      }
    );
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setFormOpen(true);
  };

  const openCreate = () => {
    setEditingLead(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Users className="h-6 w-6" />
            Lead Management
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Track and manage your potential customers.
          </p>
        </div>
        <Button onClick={openCreate} className="shadow-lg shadow-primary/20">
          <Plus className="mr-2 h-4 w-4" /> Add New Lead
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-2 rounded-lg border shadow-sm">
        <div className="relative w-full md:max-w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search leads..."
            className="pl-9 bg-background w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 flex-1 md:flex-none">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select 
              value={statusFilter} 
              onValueChange={(val) => {
                setStatusFilter(val as any);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value={GetLeadsStatus.New}>New</SelectItem>
                <SelectItem value={GetLeadsStatus.Contacted}>Contacted</SelectItem>
                <SelectItem value={GetLeadsStatus.Converted}>Converted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 flex-1 md:flex-none">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select 
              value={sort} 
              onValueChange={(val) => {
                setSort(val as GetLeadsSort);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GetLeadsSort.newest}>Newest First</SelectItem>
                <SelectItem value={GetLeadsSort.oldest}>Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="md:ml-auto">
          <ToggleGroup type="single" value={view} onValueChange={(val) => val && setView(val as any)} className="bg-background border rounded-md p-0.5">
            <ToggleGroupItem value="table" aria-label="Table view" className="h-8 px-2.5">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="card" aria-label="Card view" className="h-8 px-2.5">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !data || data.leads.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card/50 border-dashed">
            <div className="bg-muted p-4 rounded-full mb-4">
              <Inbox className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No leads found</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              {search || statusFilter !== "All" 
                ? "Try adjusting your search or filters to find what you're looking for."
                : "Get started by adding your first lead to track in the CRM."}
            </p>
            {(search || statusFilter !== "All") && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("All");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : view === "table" ? (
          <div className="rounded-md border bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[250px]">Contact Info</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px] text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.leads.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{lead.email}</div>
                      {lead.phone && <div className="text-xs text-muted-foreground mt-0.5">{lead.phone}</div>}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm border border-border/50 inline-block px-2 py-1 rounded bg-background">
                        {lead.source}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(lead.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEdit(lead)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Globe className="mr-2 h-4 w-4" /> Change status
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent>
                                {Object.values(LeadStatus).map((status) => (
                                  <DropdownMenuItem 
                                    key={status} 
                                    onClick={() => handleStatusChange(lead.id, status as LeadStatus)}
                                    disabled={lead.status === status}
                                  >
                                    {status}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive" 
                            onClick={() => setDeleteDialog({ open: true, lead })}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.leads.map((lead) => (
              <motion.div 
                key={lead.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <LeadCard lead={lead} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{((page - 1) * limit) + 1}</span> to <span className="font-medium">{Math.min(page * limit, data.total)}</span> of <span className="font-medium">{data.total}</span> results
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <LeadForm 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        lead={editingLead} 
      />

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open, lead: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the lead for <strong>{deleteDialog.lead?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteLead.isPending}
            >
              {deleteLead.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
