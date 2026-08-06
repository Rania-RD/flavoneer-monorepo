import { Loader2 } from "lucide-react";
import type React from "react";

const RunLoadingView: React.FC = () => (
  <div className="flex h-full min-h-0 items-center justify-center">
    <Loader2 className="animate-spin text-brand-primary" />
  </div>
);

export default RunLoadingView;
