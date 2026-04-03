export type UserRole = 'admin' | 'manager';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  track: string;
  status: string;
  current_stage_key: string | null;
  priority: boolean;
  delivery_date: string | null;
  description: string | null;
  materials_checklist: string | null;
  quoted_amount: number | null;
  deleted_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface OrderStage {
  id: string;
  order_id: string;
  stage_key: string;
  sequence_position: number;
  status: string;
  sanding_complete: boolean;
  started_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  photo_url: string | null;
}

export interface QcCheck {
  id: string;
  order_stage_id: string;
  checked_by: string | null;
  passed: boolean;
  checklist_json: any; // Using any for JSONB flexibility
  failure_notes: string | null;
  checked_at: string;
}

export interface DesignFile {
  id: string;
  order_id: string;
  file_url: string;
  file_name: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface Worker {
  id: string;
  name: string;
  department: string;
  phone: string | null;
  active: boolean;
  created_at: string;
}
