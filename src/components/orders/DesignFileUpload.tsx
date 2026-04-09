"use client";

import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { compressAndUpload } from "@/lib/upload";
import { createClient } from "@/lib/supabase/client";
import { Loader2, UploadCloud } from "lucide-react";

interface DesignFileUploadProps {
  orderId: string;
}

export function DesignFileUpload({ orderId }: DesignFileUploadProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Please select a design file to upload.");
      
      setUploading(true);
      try {
        const path = `${orderId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
        const photo_url = await compressAndUpload(file, path, "design-files");

        const { data: userData } = await supabase.auth.getUser();
        
        const { error } = await supabase.from("design_files").insert({
          order_id: orderId,
          file_url: photo_url,
          file_name: file.name,
          uploaded_by: userData.user?.id
        });

        if (error) throw new Error(error.message);

      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      alert("Design file uploaded successfully!");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    },
    onError: (error: Error) => {
      alert(`Upload failed: ${error.message}`);
    },
  });

  return (
    <div className="bg-surface rounded-xl border border-border p-5 shadow-sm mt-6">
      <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
        <UploadCloud className="w-5 h-5 text-primary" />
        Upload Design Spec
      </h3>
      <div className="flex flex-col gap-3">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="text-sm border border-gray-200 rounded-md p-2 w-full"
        />
        <Button
          onClick={() => mutation.mutate()}
          disabled={!file || mutation.isPending || uploading}
          className="w-full shadow-pop"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...
            </>
          ) : (
            "Upload File"
          )}
        </Button>
      </div>
    </div>
  );
}
