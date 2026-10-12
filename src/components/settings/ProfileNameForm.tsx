"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProfileNameFormProps {
  initialName: string | null;
  userEmail: string;
}

export function ProfileNameForm({ initialName, userEmail }: ProfileNameFormProps) {
  const router = useRouter();
  const defaultName = initialName || userEmail.split("@")[0];
  const [name, setName] = useState(defaultName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(defaultName);
  const [saving, setSaving] = useState(false);

  const handleEdit = () => {
    setDraft(name);
    setEditing(true);
  };

  const handleCancel = () => {
    setDraft(name);
    setEditing(false);
  };

  const handleSave = async () => {
    if (!draft.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update name");
      setName(data.name);
      setEditing(false);
      toast.success("Name updated successfully");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="text-sm text-text-secondary mb-1">Full Name</p>
      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            disabled={saving}
            autoFocus
            className="h-10 text-base"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-10 h-10 flex items-center justify-center rounded-md text-primary hover:bg-primary-soft transition-colors flex-shrink-0 border border-primary/20"
            title="Save"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="w-10 h-10 flex items-center justify-center rounded-md text-text-secondary hover:bg-surface-raised transition-colors flex-shrink-0 border border-border"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <p className="font-medium text-text-primary capitalize">{name}</p>
          <button
            onClick={handleEdit}
            className="w-9 h-9 flex items-center justify-center rounded-md text-text-secondary hover:text-primary hover:bg-primary-soft transition-all border border-border/60 hover:border-primary/30"
            title="Edit name"
            aria-label="Edit full name"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
