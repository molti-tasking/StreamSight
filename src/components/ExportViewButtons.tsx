"use client";
import { Button } from "@/components/ui/button";
import { exportPng, exportSvg } from "@/lib/exportView";
import { ImageIcon } from "lucide-react";

/** Exports the element with id `streamsight-view` (PNG at 2x, or vector SVG). */
export const ExportViewButtons = () => {
  const node = () => document.getElementById("streamsight-view");
  return (
    <div className="flex flex-row items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        title="Export the current view as PNG at 2x resolution"
        onClick={() => node() && exportPng(node()!)}
      >
        <ImageIcon /> PNG
      </Button>
      <Button
        variant="ghost"
        size="sm"
        title="Export the charts and the assignment bar as vector SVG"
        onClick={() => node() && exportSvg(node()!)}
      >
        SVG
      </Button>
    </div>
  );
};
