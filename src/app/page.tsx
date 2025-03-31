"use client";

import { DataSetForm } from "@/components/forms/DataSetForm";

export default function Home() {
  return (
    <div>
      <div className="flex flex-row justify-between border-b">
        <div className="container max-w-2xl text-white px-4 py-2 flex flex-col justify-between">
          <div className="flex items-center gap-8">
            <div className="bg-primary py-2 px-4 rounded-xs">
              <span className="font-semibold text-xl tracking-tight">
                StreamSight
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="container max-w-2xl">
        <h1 className="text-2xl mt-4 mb-2">Choose your preferred dataset</h1>
        <DataSetForm />
      </div>
    </div>
  );
}
