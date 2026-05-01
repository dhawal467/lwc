/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; fileId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Role Check
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
    return NextResponse.json({ error: "Forbidden: Admins and Managers only" }, { status: 403 });
  }

  try {
    // 2. Fetch the design file record to verify it belongs to the order and get the storage path
    const { data: file, error: fetchError } = await supabase
      .from("design_files")
      .select("*")
      .eq("id", params.fileId)
      .eq("order_id", params.id)
      .single();

    if (fetchError || !file) {
      return NextResponse.json({ error: "Design file not found or unauthorized" }, { status: 404 });
    }

    // 3. Extract storage path from file_url
    // Expected format: .../storage/v1/object/public/design-files/PATH_WE_NEED
    let storagePath = "";
    try {
      const url = new URL(file.file_url);
      const pathSegments = url.pathname.split("/design-files/");
      if (pathSegments.length > 1) {
        storagePath = decodeURIComponent(pathSegments[1]);
      } else {
        throw new Error("Could not parse storage path from URL");
      }
    } catch (err) {
      console.error("Path extraction failed:", err);
      // Fallback: if we can't delete from storage, we might still want to delete from DB
      // but let's be safe and fail here if we can't find the path.
      return NextResponse.json({ error: "Failed to parse file storage path" }, { status: 500 });
    }

    // 4. Delete from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from("design-files")
      .remove([storagePath]);

    if (storageError) {
      console.error("Storage deletion error:", storageError);
      // We continue to delete from DB even if storage deletion fails (e.g. file already gone)
    }

    // 5. Delete from DB
    const { error: dbError } = await supabase
      .from("design_files")
      .delete()
      .eq("id", params.fileId);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
