"use client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { VisualizationSettingsForm } from "./VisualizationSettingsForm";

export function VisualizationPreferencesPopover() {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button>
          <ChevronDownIcon /> Configure Presentation
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-screen-sm w-full z-[2000]">
        <VisualizationSettingsForm onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
