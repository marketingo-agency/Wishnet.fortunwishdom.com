import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { getCorsHeaders } from '../_shared/cors.ts';

interface UpdateBucketSettingsRequest {
  max_file_size_mb: number;
  total_storage_quota_gb: number;
  allowed_file_types: string[] | null;
  auto_delete_trash_days: number | null;
}

// SEC-05: validate numeric/array body fields (range + type) before they reach
// storage.updateBucket / file_settings.
function validateSettings(body: Partial<UpdateBucketSettingsRequest>): string | null {
  const { max_file_size_mb, total_storage_quota_gb, allowed_file_types, auto_delete_trash_days } = body;
  if (typeof max_file_size_mb !== 'number' || !Number.isFinite(max_file_size_mb) || max_file_size_mb <= 0 || max_file_size_mb > 5120) {
    return 'max_file_size_mb must be a number between 1 and 5120';
  }
  if (typeof total_storage_quota_gb !== 'number' || !Number.isFinite(total_storage_quota_gb) || total_storage_quota_gb <= 0 || total_storage_quota_gb > 10240) {
    return 'total_storage_quota_gb must be a number between 1 and 10240';
  }
  if (allowed_file_types !== null && !(Array.isArray(allowed_file_types) && allowed_file_types.every((t) => typeof t === 'string'))) {
    return 'allowed_file_types must be an array of strings or null';
  }
  if (auto_delete_trash_days !== null && auto_delete_trash_days !== undefined &&
      (typeof auto_delete_trash_days !== 'number' || !Number.isInteger(auto_delete_trash_days) || auto_delete_trash_days < 0 || auto_delete_trash_days > 365)) {
    return 'auto_delete_trash_days must be an integer between 0 and 365, or null';
  }
  return null;
}

Deno.serve(async (req) => {
  // SEC-01: per-request CORS from the shared allowlist (was wildcard '*').
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the requesting user via getUser (server round-trip, validates token properly)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const userId = user.id;

    // Use service role for privileged bucket operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: userId });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const body: UpdateBucketSettingsRequest = await req.json();

    // SEC-05: reject malformed/out-of-range input before it touches storage config.
    const validationError = validateSettings(body);
    if (validationError) {
      return new Response(
        JSON.stringify({ error: validationError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { max_file_size_mb, total_storage_quota_gb, allowed_file_types, auto_delete_trash_days } = body;

    const requestedMB = max_file_size_mb;
    
    // Convert MB to bytes for Supabase Storage
    const fileSizeLimitBytes = requestedMB * 1024 * 1024;

    console.log(`Attempting to set bucket file size limit to ${requestedMB}MB (${fileSizeLimitBytes} bytes)`);

    // Try to update the 'files' bucket
    const { error: filesError } = await supabase.storage.updateBucket('files', {
      public: true,
      fileSizeLimit: fileSizeLimitBytes,
    });

    // If it fails due to size limit, return a clear error with instructions
    if (filesError && filesError.message?.includes('exceeded the maximum allowed size')) {
      console.log(`Requested limit ${requestedMB}MB exceeds Supabase Global file size limit.`);
      return new Response(
        JSON.stringify({ 
          error: 'global_limit_exceeded',
          message: `Cannot set ${requestedMB}MB limit. Your Supabase Global file size limit is lower.`,
          instructions: 'Increase the project Storage "Global file size limit" in the Supabase Dashboard first.',
          requested_limit_mb: requestedMB,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (filesError) {
      console.error('Error updating files bucket:', filesError);
      throw new Error(`Failed to update files bucket: ${filesError.message}`);
    }

    // Update the 'brain-documents' bucket with the same limit
    const { error: brainError } = await supabase.storage.updateBucket('brain-documents', {
      public: true,
      fileSizeLimit: fileSizeLimitBytes,
    });

    if (brainError) {
      console.error('Error updating brain-documents bucket:', brainError);
      throw new Error(`Failed to update brain-documents bucket: ${brainError.message}`);
    }

    // Get the existing settings ID
    const { data: existingSettings, error: fetchError } = await supabase
      .from('file_settings')
      .select('id')
      .single();

    if (fetchError) {
      console.error('Error fetching existing settings:', fetchError);
      throw new Error(`Failed to fetch settings: ${fetchError.message}`);
    }

    // Update the file_settings table
    const { data: updatedSettings, error: updateError } = await supabase
      .from('file_settings')
      .update({
        max_file_size_mb: requestedMB,
        total_storage_quota_gb,
        allowed_file_types,
        auto_delete_trash_days,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSettings.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating file_settings:', updateError);
      throw new Error(`Failed to update settings: ${updateError.message}`);
    }

    console.log(`Successfully updated bucket settings. Limit: ${requestedMB}MB`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        settings: updatedSettings,
        bucket_file_size_limit: fileSizeLimitBytes,
        actual_limit_mb: requestedMB,
        was_limited: false,
        message: `File size limit set to ${requestedMB}MB`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Update bucket settings error:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
