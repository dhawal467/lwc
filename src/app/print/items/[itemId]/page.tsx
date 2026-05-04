import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PrintPageControls } from "@/components/print/PrintPageControls";

const STAGE_LABELS: Record<string, string> = {
  carpentry: "Carpentry",
  frame_making: "Frame Making",
  polish: "Polish & Finish",
  upholstery: "Upholstery",
  qc_check: "QC Check",
  dispatch: "Dispatch",
};

function stageStatus(stage: { status: string }) {
  if (stage.status === "completed") return "completed";
  if (stage.status === "in_progress") return "active";
  return "pending";
}

export default async function PrintItemPage({
  params,
}: {
  params: { itemId: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: item, error } = await supabase
    .from("order_items")
    .select(
      `
      *,
      order_stages ( id, stage_key, status, sequence_position, started_at, completed_at ),
      orders!inner (
        id, order_number, delivery_date, description, materials_checklist,
        customers ( name ),
        design_files ( id, file_url, file_name )
      )
    `
    )
    .eq("id", params.itemId)
    .is("deleted_at", null)
    .single();

  if (error || !item) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = item.orders as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customer = order?.customers as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const designFiles: any[] = order?.design_files ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stages = ((item.order_stages as any[]) ?? []).sort(
    (a, b) => a.sequence_position - b.sequence_position
  );

  const heroPhoto =
    item.photo_url ??
    (designFiles.length > 0 ? designFiles[0].file_url : null);
  const referencePhotos = item.photo_url ? designFiles : designFiles.slice(1);

  const deliveryLabel = order?.delivery_date
    ? new Date(order.delivery_date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Not specified";

  const generatedAt = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const trackLabel =
    item.track === "B" ? "Track B — Upholstered" : "Track A — Carpentry";

  const pageTitle = `${order?.order_number} · ${item.name}`;

  const materials: string[] = order?.materials_checklist
    ? order.materials_checklist
        .split("\n")
        .map((l: string) => l.trim())
        .filter(Boolean)
    : [];

  return (
    <>
      <style>{`
        @page { size: A4; margin: 1.5cm; }
        @media print {
          .print-hide { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <PrintPageControls title={pageTitle} />

      <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "system-ui, sans-serif" }}>
        <div className="max-w-[794px] mx-auto px-10 pt-20 pb-12 print:pt-0 print:px-0">

          {/* ── Header ── */}
          <div className="flex justify-between items-start pb-4 mb-6 border-b-2 border-gray-900">
            <div>
              <p className="text-2xl font-black uppercase tracking-tight">FurnitureMFG</p>
              <p className="text-xs uppercase tracking-widest text-gray-500 mt-0.5">Production Work Order</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold">{order?.order_number}</p>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-0.5">
                Confidential · Internal Use Only
              </p>
            </div>
          </div>

          {/* ── Info Bar ── */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 bg-gray-50 border border-gray-200 rounded-xl p-5">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Item</p>
              <p className="text-xl font-bold leading-tight">{item.name}</p>
              {item.quantity > 1 && (
                <p className="text-sm text-gray-500 mt-0.5">Quantity: {item.quantity}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Customer</p>
              <p className="text-xl font-semibold leading-tight">{customer?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Track</p>
              <p className="text-sm font-medium">{trackLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Delivery Due</p>
              <p className="text-sm font-semibold">{deliveryLabel}</p>
            </div>
          </div>

          {/* ── Hero Photo ── */}
          {heroPhoto && (
            <div className="mb-6 rounded-xl overflow-hidden border border-gray-200" style={{ maxHeight: 420 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroPhoto}
                alt={item.name}
                className="w-full object-cover"
                style={{ maxHeight: 420 }}
              />
            </div>
          )}

          {/* ── Stage Progress ── */}
          {stages.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-3">Production Stages</p>
              <div className="flex items-center">
                {stages.map((stage, i) => {
                  const s = stageStatus(stage);
                  return (
                    <div key={stage.id} className="flex items-center flex-1 min-w-0">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            background:
                              s === "completed" ? "#16a34a" :
                              s === "active" ? "#d97706" : "#e5e7eb",
                            color: s === "pending" ? "#9ca3af" : "white",
                          }}
                        >
                          {s === "completed" ? "✓" : i + 1}
                        </div>
                        <p
                          className="text-[9px] text-center mt-1 leading-tight"
                          style={{
                            color: s === "completed" ? "#15803d" : s === "active" ? "#b45309" : "#9ca3af",
                            fontWeight: s === "pending" ? 400 : 600,
                            maxWidth: 60,
                          }}
                        >
                          {STAGE_LABELS[stage.stage_key] ?? stage.stage_key}
                        </p>
                      </div>
                      {i < stages.length - 1 && (
                        <div
                          className="h-0.5 flex-1 mx-1"
                          style={{ background: s === "completed" ? "#16a34a" : "#e5e7eb" }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Description ── */}
          {item.description && (
            <div className="mb-6 p-5 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Description</p>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{item.description}</p>
            </div>
          )}

          {/* ── Materials Checklist ── */}
          {materials.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-3">Materials Checklist</p>
              <div className="grid grid-cols-2 gap-2">
                {materials.map((mat, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-4 h-4 border border-gray-400 rounded-sm flex-shrink-0 inline-block" />
                    {mat}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Design Reference Photos ── */}
          {referencePhotos.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-3">Design References</p>
              <div className="grid grid-cols-3 gap-3">
                {referencePhotos.map((file) => (
                  <div key={file.id} className="rounded-lg overflow-hidden border border-gray-200 aspect-video">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={file.file_url}
                      alt={file.file_name ?? "Design reference"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Worker Notes ── */}
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Worker Notes</p>
            <div className="h-28 border border-dashed border-gray-300 rounded-xl" />
          </div>

          {/* ── Footer ── */}
          <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
            <p className="text-[10px] text-gray-400">Generated: {generatedAt}</p>
            <p className="text-[10px] text-gray-400">
              FurnitureMFG · {order?.order_number} · {item.name}
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
