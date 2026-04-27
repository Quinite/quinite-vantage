import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 204 }))
}

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const { fileName, contentType } = await request.json()
    if (!fileName || !contentType) {
      return handleCORS(NextResponse.json({ error: 'fileName and contentType required' }, { status: 400 }))
    }

    if (contentType !== 'application/pdf') {
      return handleCORS(NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 }))
    }

    const admin = createAdminClient()
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return handleCORS(NextResponse.json({ error: 'Organization not found' }, { status: 400 }))
    }

    const brochurePath = `brochures/${profile.organization_id}/${crypto.randomUUID()}.pdf`

    const { data, error } = await admin.storage
      .from('project-brochures')
      .createSignedUploadUrl(brochurePath)

    if (error) {
      return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }))
    }

    const { data: publicUrl } = admin.storage
      .from('project-brochures')
      .getPublicUrl(brochurePath)

    return handleCORS(NextResponse.json({
      uploadUrl: data.signedUrl,
      brochure_url: publicUrl.publicUrl,
      brochure_path: brochurePath
    }))
  } catch (err) {
    console.error('BROCHURE UPLOAD URL ERROR:', err)
    return handleCORS(NextResponse.json({ error: 'Server error' }, { status: 500 }))
  }
}
