import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { DataProcessingSettingsForm } from "./DataProcessingSettingsForm";
import { SettingsIcon } from "lucide-react";

export function DataProcessingSettingsDialog() {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <Dialog open={isOpen} onOpenChange={(isOpen) => setIsOpen(isOpen)}>
      <DialogTrigger asChild className="cursor-pointer">
        <Button variant="ghost" size={"icon"}>
          <SettingsIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Data Processing</DialogTitle>
          <DialogDescription>Configure your clustering logic</DialogDescription>
        </DialogHeader>
        <DataProcessingSettingsForm onClose={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
