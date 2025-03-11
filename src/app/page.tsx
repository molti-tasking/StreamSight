"use client";

import { DataSetForm } from "@/components/forms/DataSetForm";

export default function Home() {
  return (
    <div className="container">
      <h1 className="text-2xl mt-4">Choose your preferred dataset</h1>
      <DataSetForm />
    </div>
  );
}
