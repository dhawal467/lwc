import { createServiceRoleClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = createServiceRoleClient()
  
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: `debug-${Date.now()}@example.com`,
      password: 'password123',
      email_confirm: true,
      user_metadata: {} // Trigger the potential null metadata issue
    })

    if (error) {
       console.error('Supabase Auth error:', error)
      return NextResponse.json({ 
        success: false,
        error: error,
        details: error.message,
        hint: 'Check if handle_new_user() trigger is failing due to NULL metadata'
      }, { status: 400 })
    }

    return NextResponse.json({ 
        success: true,
        data 
    })
  } catch (err: any) {
    console.error('Unexpected signup error:', err)
    return NextResponse.json({ 
      success: false,
      error: 'Unexpected error', 
      details: err.message,
      fullError: err 
    }, { status: 500 })
  }
}
