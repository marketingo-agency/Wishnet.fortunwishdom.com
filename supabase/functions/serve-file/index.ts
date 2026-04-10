import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// MIME type mapping based on file extension
const mimeTypes: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  txt: "text/plain",
  csv: "text/csv",
  json: "application/json",
};

function getMimeType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  return mimeTypes[ext] || "application/octet-stream";
}

function errorResponse(
  status: number,
  message: string,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...headers },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const bucket = url.searchParams.get("bucket");
    const path = url.searchParams.get("path");
    const token = url.searchParams.get("token");
    const filename = url.searchParams.get("filename");

    // Validate required params
    if (!bucket || !path || !token) {
      return errorResponse(400, "Missing required parameters: bucket, path, token");
    }

    // Validate bucket name (only allow known buckets)
    if (!["files", "brain-documents"].includes(bucket)) {
      return errorResponse(400, "Invalid bucket name");
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing environment variables");
      return errorResponse(500, "Server configuration error");
    }

    // Verify auth via getUser (server round-trip, validates token properly)
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      console.error("Auth error:", userError);
      return errorResponse(401, "Unauthorized - invalid or expired token");
    }

    const userId = user.id;

    // Service-role client for privileged storage/db access
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    console.log(`[serve-file] User ${userId} requesting ${bucket}/${path}`);

    // Verify file access based on bucket
    if (bucket === "files") {
      // User must own the file
      const { data: fileRecord, error: fileError } = await supabaseAdmin
        .from("files")
        .select("id")
        .eq("storage_path", path)
        .eq("user_id", userId)
        .maybeSingle();

      if (fileError) {
        console.error("Database error:", fileError);
        return errorResponse(500, "Database error");
      }

      if (!fileRecord) {
        console.warn(`[serve-file] Access denied: user ${userId} does not own file ${path}`);
        return errorResponse(403, "Access denied - you do not own this file");
      }
    }
    // For brain-documents: any authenticated user can access (per RLS policy)
    // Authentication check above is sufficient

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(bucket)
      .download(path);

    if (downloadError) {
      console.error("Storage download error:", downloadError);
      return errorResponse(500, "Failed to download file from storage");
    }

    if (!fileData) {
      return errorResponse(404, "File not found in storage");
    }

    // Determine MIME type
    const mimeType = getMimeType(path);
    const displayName = filename || path.split("/").pop() || "file";

    console.log(`[serve-file] Serving file: ${displayName} (${mimeType}, ${fileData.size} bytes)`);

    // Return file for inline viewing
    return new Response(fileData, {
      headers: {
        ...corsHeaders,
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(displayName)}"`,
        "Cache-Control": "private, max-age=3600",
        "Content-Length": fileData.size.toString(),
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return errorResponse(500, "Internal server error");
  }
});
