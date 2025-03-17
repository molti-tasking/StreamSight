import { Loader2 } from "lucide-react";

export default async function Loading() {
  return (
    <div className="h-96 flex flex-row items-start pt-16 justify-center w-full">
      <div className="min-h-4">
        <div className="p-4 flex flex-row items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p>Loading...</p>
        </div>
      </div>
    </div>
  );
}
