import { Loader2 } from "lucide-react";
import type React from "react";

const RunLoadingView: React.FC = () => (
  <div className="flex h-screen items-center justify-center">
    <Loader2 className="animate-spin text-blue-500" />
  </div>
);

export default RunLoadingView;
