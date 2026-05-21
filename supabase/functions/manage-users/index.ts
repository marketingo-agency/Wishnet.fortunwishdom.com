import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0'
import { getCorsHeaders } from '../_shared/cors.ts'
import { createRateLimiter } from '../_shared/rate-limit.ts'

// SEC-02: rate-limit the privileged user-management surface (create/delete/role).
const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 })

Deno.serve(async (req) => {
  // SEC-01: per-request CORS from the shared allowlist (was wildcard '*').
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'))

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Verify the caller via getUser (server round-trip, validates token properly)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const callerId = user.id

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Check if caller is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .single()

    if (roleError || roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // SEC-02: rate limit privileged actions per admin (10/min)
    if (rateLimiter.check(callerId)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please slow down.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await req.json()
    const { action, email, password, fullName, role, userId } = body

    if (action === 'create') {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })

      if (createError) {
        console.error('Failed to create user:', createError.message)
        return new Response(
          JSON.stringify({ error: 'Failed to create user' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Wait a moment for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 500))

      // Update the profile with full name
      if (fullName) {
        await supabaseAdmin
          .from('profiles')
          .update({ full_name: fullName })
          .eq('id', newUser.user.id)
      }

      // Assign role
      const { error: roleInsertError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: newUser.user.id, role: role || 'agent' })

      if (roleInsertError) {
        // If role insert fails, still return success but log it
        console.error('Failed to insert role:', roleInsertError)
      }

      // Create default permissions for the user
      const { error: permissionsError } = await supabaseAdmin
        .from('user_permissions')
        .insert({ user_id: newUser.user.id })

      if (permissionsError) {
        console.error('Failed to create permissions:', permissionsError)
      }

      // SEC-010: Audit log for admin user creation
      await supabaseAdmin.from('osha_audit_logs').insert({
        user_id: callerId,
        heart_rules_used: [],
        brain_chunks_used: 0,
        compliance_status: 'pass',
        compliance_notes: `Admin action: create user ${newUser.user.email} (${newUser.user.id}), role=${role || 'agent'}`,
        llm_provider: null,
        llm_model: null,
      }).then(({ error: auditErr }) => { if (auditErr) console.error('Audit log failed:', auditErr); });

      return new Response(
        JSON.stringify({ success: true, userId: newUser.user.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'updateRole') {
      if (!userId || !role) {
        return new Response(
          JSON.stringify({ error: 'User ID and role required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if user has a role record
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (existingRole) {
        // Update existing role
        const { error: updateError } = await supabaseAdmin
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId)

        if (updateError) {
          console.error('Failed to update role:', updateError.message)
          return new Response(
            JSON.stringify({ error: 'Failed to update role' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        // Insert new role
        const { error: insertError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: userId, role })

        if (insertError) {
          console.error('Failed to update role:', insertError.message)
          return new Response(
            JSON.stringify({ error: 'Failed to update role' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // SEC-010: Audit log for admin role update
      await supabaseAdmin.from('osha_audit_logs').insert({
        user_id: callerId,
        heart_rules_used: [],
        brain_chunks_used: 0,
        compliance_status: 'pass',
        compliance_notes: `Admin action: updateRole for user ${userId} to ${role}`,
        llm_provider: null,
        llm_model: null,
      }).then(({ error: auditErr }) => { if (auditErr) console.error('Audit log failed:', auditErr); });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'delete') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID required for deletion' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Prevent self-deletion
      if (userId === callerId) {
        return new Response(
          JSON.stringify({ error: 'Cannot delete your own account' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete user (cascade will handle profile and role)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

      if (deleteError) {
        console.error('Failed to delete user:', deleteError.message)
        return new Response(
          JSON.stringify({ error: 'Failed to delete user' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // SEC-010: Audit log for admin user deletion
      await supabaseAdmin.from('osha_audit_logs').insert({
        user_id: callerId,
        heart_rules_used: [],
        brain_chunks_used: 0,
        compliance_status: 'pass',
        compliance_notes: `Admin action: delete user ${userId}`,
        llm_provider: null,
        llm_model: null,
      }).then(({ error: auditErr }) => { if (auditErr) console.error('Audit log failed:', auditErr); });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
