import { CircleCheck, OctagonX, TriangleAlert } from "lucide-react";
import { Badge } from "./Badge";

export type RiskLevel = "low" | "medium" | "high" | "critical";

const styles = {
  low: { label: "Low risk", Icon: CircleCheck, className: "bg-risk-low-bg text-risk-low" },
  medium: { label: "Medium risk", Icon: TriangleAlert, className: "bg-risk-medium-bg text-risk-medium" },
  high: { label: "High risk", Icon: TriangleAlert, className: "bg-risk-high-bg text-risk-high" },
  critical: { label: "Critical", Icon: OctagonX, className: "bg-risk-critical-bg text-risk-critical" },
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  const { label, Icon, className } = styles[level];
  return (
    <Badge className={className}>
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </Badge>
  );
}
