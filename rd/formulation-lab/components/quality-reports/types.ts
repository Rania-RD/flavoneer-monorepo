import type { Id } from "@flavoneer/backend/data-model";

export interface QualityReportArgs {
  departmentName?: string;
  from: number;
  now: number;
  organizationId: Id<"organizations">;
  productId?: Id<"projects">;
  productionHallCode?: "A" | "B";
  qcUserId?: string;
  specificationVersion?: number;
  status?: "draft" | "pending_production_review" | "returned" | "approved";
  to: number;
}

export interface QualityReportProductOption {
  id: Id<"projects">;
  name: string;
}
