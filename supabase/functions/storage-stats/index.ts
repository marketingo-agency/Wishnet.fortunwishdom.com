import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface BucketStats {
  count: number;
  size: number;
}

interface BucketLimits {
  file_size_limit: number | null;
  allowed_mime_types: string[] | null;
}

interface StorageStatsResponse {
  used: number;
  total: number;
  buckets: {
    files: BucketStats;
    'brain-documents': BucketStats;
    'wishpedia-media': BucketStats;
  };
  bucket_limits: {
    files: BucketLimits;
    'brain-documents': BucketLimits;
    'wishpedia-media': BucketLimits;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    // Verify auth via getUser (server round-trip, validates token properly)
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Query files table for files bucket stats
    const { data: filesData, error: filesError } = await supabase
      .from('files')
      .select('size');

    if (filesError) {
      console.error('Error fetching files:', filesError);
    }

    // Query brain_documents table for brain-documents bucket stats
    const { data: brainData, error: brainError } = await supabase
      .from('brain_documents')
      .select('size');

    if (brainError) {
      console.error('Error fetching brain documents:', brainError);
    }

    // AGENT-015: Query wishpedia_entry_images for wishpedia-media bucket stats
    const { data: wishpediaData, error: wishpediaError } = await supabase
      .from('wishpedia_entry_images')
      .select('file_size');

    if (wishpediaError) {
      console.error('Error fetching wishpedia images:', wishpediaError);
    }

    // Calculate stats
    const filesStats: BucketStats = {
      count: filesData?.length || 0,
      size: filesData?.reduce((acc, file) => acc + (file.size || 0), 0) || 0,
    };

    const brainStats: BucketStats = {
      count: brainData?.length || 0,
      size: brainData?.reduce((acc, doc) => acc + (doc.size || 0), 0) || 0,
    };

    const wishpediaStats: BucketStats = {
      count: wishpediaData?.length || 0,
      size: wishpediaData?.reduce((acc, img) => acc + (img.file_size || 0), 0) || 0,
    };

    // Get dynamic quota from file_settings table
    const { data: fileSettings } = await supabase
      .from('file_settings')
      .select('total_storage_quota_gb')
      .single();

    // Default to 5GB if no settings found, otherwise convert GB to bytes
    const totalQuota = fileSettings?.total_storage_quota_gb 
      ? fileSettings.total_storage_quota_gb * 1024 * 1024 * 1024 
      : 5368709120; // 5GB default

    // Fetch actual bucket configurations for real limits
    const { data: filesBucket, error: filesBucketError } = await supabase.storage.getBucket('files');
    if (filesBucketError) {
      console.error('Error fetching files bucket config:', filesBucketError);
    }

    const { data: brainBucket, error: brainBucketError } = await supabase.storage.getBucket('brain-documents');
    if (brainBucketError) {
      console.error('Error fetching brain-documents bucket config:', brainBucketError);
    }

    const { data: wishpediaBucket, error: wishpediaBucketError } = await supabase.storage.getBucket('wishpedia-media');
    if (wishpediaBucketError) {
      console.error('Error fetching wishpedia-media bucket config:', wishpediaBucketError);
    }

    const response: StorageStatsResponse = {
      used: filesStats.size + brainStats.size + wishpediaStats.size,
      total: totalQuota,
      buckets: {
        files: filesStats,
        'brain-documents': brainStats,
        'wishpedia-media': wishpediaStats,
      },
      bucket_limits: {
        files: {
          file_size_limit: filesBucket?.file_size_limit || null,
          allowed_mime_types: filesBucket?.allowed_mime_types || null,
        },
        'brain-documents': {
          file_size_limit: brainBucket?.file_size_limit || null,
          allowed_mime_types: brainBucket?.allowed_mime_types || null,
        },
        'wishpedia-media': {
          file_size_limit: wishpediaBucket?.file_size_limit || null,
          allowed_mime_types: wishpediaBucket?.allowed_mime_types || null,
        },
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Storage stats error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
