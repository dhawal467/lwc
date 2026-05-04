import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PrintPageControls } from "@/components/print/PrintPageControls";
import type { Metadata } from "next";

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

// ── Dynamic page title → becomes the PDF filename in the browser dialog ──
export async function generateMetadata({
  params,
}: {
  params: { itemId: string };
}): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase
    .from("order_items")
    .select("name, orders!inner(order_number)")
    .eq("id", params.itemId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderNumber = (data?.orders as any)?.order_number ?? "order";
  return { title: `${orderNumber}_print_sheet` };
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
      order_stages ( id, stage_key, status, sequence_position ),
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
    item.photo_url ?? (designFiles.length > 0 ? designFiles[0].file_url : null);
  // Cap reference photos to 3 to preserve single-page fit
  const referencePhotos = (item.photo_url ? designFiles : designFiles.slice(1)).slice(0, 3);

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
  });

  const trackLabel =
    item.track === "B" ? "Track B — Upholstered" : "Track A — Carpentry";

  const pageTitle = `${order?.order_number} · ${item.name}`;

  // Cap materials at 8 lines to prevent overflow
  const materials: string[] = (order?.materials_checklist
    ? order.materials_checklist
        .split("\n")
        .map((l: string) => l.trim())
        .filter(Boolean)
    : []
  ).slice(0, 8);

  return (
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 1cm;
        }
        @media print {
          .print-hide { display: none !important; }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Force entire content into one page */
          .print-root {
            height: 257mm;
            overflow: hidden;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <PrintPageControls title={pageTitle} />

      <div
        className="bg-white text-gray-900 print-root"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        <div className="max-w-[794px] mx-auto px-8 pt-16 pb-4 print:pt-0 print:px-0">

          {/* ── Header ── */}
          <div className="flex justify-between items-start pb-3 mb-3 border-b-2 border-gray-900">
            <div>
              <p className="text-lg font-black uppercase tracking-tight">FurnitureMFG</p>
              <p className="text-[9px] uppercase tracking-widest text-gray-500">Production Work Order</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-mono font-bold">{order?.order_number}</p>
              <p className="text-[9px] uppercase tracking-widest text-gray-400">
                Confidential · Internal Use Only
              </p>
            </div>
          </div>

          {/* ── Info Bar ── */}
          <div className="grid grid-cols-4 gap-3 mb-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="col-span-2">
              <p className="text-[9px] uppercase tracking-widest text-gray-400">Item</p>
              <p className="text-base font-bold leading-tight">{item.name}{item.quantity > 1 && <span className="text-sm font-normal text-gray-500 ml-1">× {item.quantity}</span>}</p>
            </div>
            <div className="col-span-2 text-right">
              <p className="text-[9px] uppercase tracking-widest text-gray-400">Customer</p>
              <p className="text-base font-semibold leading-tight">{customer?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-gray-400">Track</p>
              <p className="text-xs font-medium">{trackLabel}</p>
            </div>
            <div className="col-span-3 text-right">
              <p className="text-[9px] uppercase tracking-widest text-gray-400">Delivery Due</p>
              <p className="text-xs font-semibold">{deliveryLabel}</p>
            </div>
          </div>

          {/* ── Hero Photo (full width) ── */}
          {heroPhoto && (
            <div
              className="mb-3 rounded-lg overflow-hidden border border-gray-200 w-full"
              style={{ height: 240 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroPhoto}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* ── Description + Materials (side by side below photo) ── */}
          {(item.description || materials.length > 0) && (
            <div className="flex gap-3 mb-3">
              {item.description && (
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                  <p className="text-[9px] uppercase tracking-widest text-gray-400 mb-1">Description</p>
                  <p className="text-xs text-gray-800 leading-relaxed line-clamp-3">{item.description}</p>
                </div>
              )}
              {materials.length > 0 && (
                <div className="flex-1">
                  <p className="text-[9px] uppercase tracking-widest text-gray-400 mb-1">Materials</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {materials.map((mat, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-gray-700">
                        <span className="w-3 h-3 border border-gray-400 rounded-sm flex-shrink-0 inline-block" />
                        <span className="truncate">{mat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Stage Progress ── */}
          {stages.length > 0 && (
            <div className="mb-3">
              <p className="text-[9px] uppercase tracking-widest text-gray-400 mb-2">Production Stages</p>
              <div className="flex items-center">
                {stages.map((stage, i) => {
                  const s = stageStatus(stage);
                  return (
                    <div key={stage.id} className="flex items-center flex-1 min-w-0">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
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
                          className="text-[8px] text-center mt-0.5 leading-tight"
                          style={{
                            color: s === "completed" ? "#15803d" : s === "active" ? "#b45309" : "#9ca3af",
                            fontWeight: s === "pending" ? 400 : 600,
                            maxWidth: 52,
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

          {/* ── Design Reference Photos (max 3) ── */}
          {referencePhotos.length > 0 && (
            <div className="mb-3">
              <p className="text-[9px] uppercase tracking-widest text-gray-400 mb-2">Design References</p>
              <div className="grid grid-cols-3 gap-2">
                {referencePhotos.map((file) => (
                  <div key={file.id} className="rounded-lg overflow-hidden border border-gray-200" style={{ height: 90 }}>
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
          <div className="mb-3">
            <p className="text-[9px] uppercase tracking-widest text-gray-400 mb-1">Worker Notes</p>
            <div className="border border-dashed border-gray-300 rounded-lg" style={{ height: 64 }} />
          </div>

          {/* ── Footer ── */}
          <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
            <p className="text-[8px] text-gray-400">Generated: {generatedAt}</p>
            <p className="text-[8px] text-gray-400">
              FurnitureMFG · {order?.order_number} · {item.name}
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
