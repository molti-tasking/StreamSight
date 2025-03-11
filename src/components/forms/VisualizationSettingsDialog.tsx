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
import { VisualizationSettingsForm } from "./VisualizationSettingsForm";

export function VisualizationSettingsDialog() {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <Dialog open={isOpen} onOpenChange={(isOpen) => setIsOpen(isOpen)}>
      <DialogTrigger asChild>
        <Button variant="light">Streamclusters</Button>
      </DialogTrigger>
      <DialogContent className="lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Streamclusters</DialogTitle>
          <DialogDescription>
            Build your combinations of tools for the suitable visualization.
          </DialogDescription>
        </DialogHeader>
        <VisualizationSettingsForm onClose={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
