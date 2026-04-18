import { useState } from "react";
import { format } from "date-fns";
import { Phone, Mail, Globe, MoreHorizontal, Edit, Trash2, CalendarDays } from "lucide-react";
import { Lead, LeadStatus, useDeleteLead, useUpdateLeadStatus, getGetLeadsQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { Button } from "@/components/ui/button";
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
import { LeadForm } from "./lead-form";

export function LeadCard({ lead }: { lead: Lead }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteLead = useDeleteLead();
  const updateStatus = useUpdateLeadStatus();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
  };

  const handleDelete = () => {
    deleteLead.mutate(
      { id: lead.id },
      {
        onSuccess: () => {
          toast({ title: "Lead deleted successfully" });
          invalidateQueries();
          setShowDeleteDialog(false);
        },
        onError: () => {
          toast({ title: "Failed to delete lead", variant: "destructive" });
        }
      }
    );
  };

  const handleStatusChange = (status: LeadStatus) => {
    updateStatus.mutate(
      { id: lead.id, data: { status: status as any } },
      {
        onSuccess: () => {
          toast({ title: `Status updated to ${status}` });
          invalidateQueries();
        },
        onError: () => {
          toast({ title: "Failed to update status", variant: "destructive" });
        }
      }
    );
  };

  return (
    <>
      <Card className="flex flex-col overflow-hidden hover:shadow-md transition-shadow group border-border/60 bg-card/60 backdrop-blur-sm">
        <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
          <div>
            <h3 className="font-semibold text-lg line-clamp-1">{lead.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-1">{lead.email}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                <Edit className="mr-2 h-4 w-4" /> Edit lead
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
                        onClick={() => handleStatusChange(status as LeadStatus)}
                        disabled={lead.status === status}
                      >
                        {status}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        
        <CardContent className="p-4 py-2 flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <StatusBadge status={lead.status} />
            <div className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
              {lead.source}
            </div>
          </div>
          
          <div className="space-y-2 text-sm pt-2 border-t border-border/50">
            {lead.phone && (
              <div className="flex items-center text-muted-foreground gap-2">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{lead.phone}</span>
              </div>
            )}
            <div className="flex items-center text-muted-foreground gap-2">
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{lead.email}</span>
            </div>
            {lead.notes && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-2 bg-muted/30 p-2 rounded italic">
                "{lead.notes}"
              </p>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="p-4 pt-3 text-xs text-muted-foreground border-t border-border/30 bg-muted/10 flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>Added {format(new Date(lead.createdAt), "MMM d, yyyy")}</span>
        </CardFooter>
      </Card>

      <LeadForm 
        open={showEditDialog} 
        onOpenChange={setShowEditDialog} 
        lead={lead} 
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the lead for <strong>{lead.name}</strong> and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteLead.isPending}
            >
              {deleteLead.isPending ? "Deleting..." : "Delete Lead"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
