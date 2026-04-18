import { Badge } from "@/components/ui/badge";
import { LeadStatus } from "@workspace/api-client-react";

export function StatusBadge({ status }: { status: string }) {
  let colorClass = "";
  
  switch (status) {
    case LeadStatus.New:
      colorClass = "bg-blue-500 hover:bg-blue-600 text-white";
      break;
    case LeadStatus.Contacted:
      colorClass = "bg-orange-500 hover:bg-orange-600 text-white";
      break;
    case LeadStatus.Converted:
      colorClass = "bg-green-500 hover:bg-green-600 text-white";
      break;
    default:
      colorClass = "bg-gray-500 hover:bg-gray-600 text-white";
  }

  return (
    <Badge className={`${colorClass} border-transparent font-medium`}>
      {status}
    </Badge>
  );
}
