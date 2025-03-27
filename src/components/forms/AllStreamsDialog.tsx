import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { SidebarOpenIcon } from "lucide-react";
import { useRawDataStore } from "@/store/useRawDataStore";
import { Badge } from "../ui/badge";

export function AllStreamsDialog() {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <Dialog open={isOpen} onOpenChange={(isOpen) => setIsOpen(isOpen)}>
      <DialogTrigger asChild className="cursor-pointer">
        <Button variant="ghost" size={"icon"}>
          <SidebarOpenIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Data Streams</DialogTitle>
        </DialogHeader>

        <AllStreamsDialogContent />
      </DialogContent>
    </Dialog>
  );
}

const AllStreamsDialogContent = () => {
  const dimensions = useRawDataStore((store) => store.dimensions);

  return (
    <div className="flex flex-row gap-1 flex-wrap">
      {dimensions.map((dim) => (
        <Badge key={dim}>{dim}</Badge>
      ))}
    </div>
  );
};
