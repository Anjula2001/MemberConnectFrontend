"use client";
import { Input } from "@/components/ui/input"; 


export default function DocumentUpload(){

  return (
    <div className="p-4 bg-gray rounded-lg flex flex-col gap-4">
      <h2 className="mb-4 text-xl font-bold text-[#953002]">Documents</h2>

      <section className="rounded-lg border p-4 h-half bg-white">
        <h3 className="mb-4 text-lg text-black text-center">Upload Document</h3>
        <Input type="file" multiple />
      </section>  
    </div>
  );
}