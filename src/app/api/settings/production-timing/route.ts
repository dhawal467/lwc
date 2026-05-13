import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("production_stage_config")
    .select("*")
    .order("track", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
  }

  try {
    const { configs } = await request.json();

    if (!Array.isArray(configs)) {
      return NextResponse.json({ error: "Configs must be an array" }, { status: 400 });
    }

    // Perform updates sequentially or with Promise.all
    const results = await Promise.all(
      configs.map(async (c: { id: string, expected_hours: number }) => {
        const { data, error } = await supabase
          .from("production_stage_config")
          .update({ expected_hours: c.expected_hours, updated_at: new Date().toISOString() })
          .eq("id", c.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      })
    );

    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
