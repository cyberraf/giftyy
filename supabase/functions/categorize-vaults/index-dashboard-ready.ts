// Supabase Edge Function: Categorize Videos into Vaults
// This function uses GPT to automatically categorize videos into vaults based on:
// - Video titles
// - Dates (created_at)
// - Time of year patterns (birthdays, anniversaries, holidays)
// - Location from shipping addresses (city, state, country)
//
// DASHBOARD-READY VERSION: CORS headers are inlined (no shared imports)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Inline CORS headers (for dashboard deployment)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface VideoData {
  id: string;
  title: string;
  created_at: string;
  order_id?: string;
  order_city?: string;
  order_state?: string;
  order_country?: string;
}

interface VaultSuggestion {
  name: string;
  description?: string;
  category_type: string;
  video_ids: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!OPENAI_API_KEY) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all users who have video messages
    const { data: usersWithVideos, error: usersError } = await supabase
      .from('video_messages')
      .select('user_id')
      .not('user_id', 'is', null);

    if (usersError) {
      throw new Error(`Error fetching users: ${usersError.message}`);
    }

    const uniqueUserIds = [...new Set(usersWithVideos?.map((u) => u.user_id) || [])];

    console.log(`Processing ${uniqueUserIds.length} users with video messages`);

    // Process each user
    for (const userId of uniqueUserIds) {
      try {
        // Fetch video messages
        const { data: videos, error: videosError } = await supabase
          .from('video_messages')
          .select('id, title, created_at, order_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (videosError) {
          console.error(`Error fetching videos for user ${userId}:`, videosError);
          continue;
        }

        if (!videos || videos.length === 0) {
          continue;
        }

        // Get unique order IDs
        const orderIds = [...new Set(videos.filter((v: any) => v.order_id).map((v: any) => v.order_id))];

        // Fetch order shipping addresses if we have order IDs
        let ordersMap = new Map<string, { city?: string; state?: string; country?: string }>();
        if (orderIds.length > 0) {
          const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id, recipient_city, recipient_state, recipient_country')
            .in('id', orderIds);

          if (!ordersError && orders) {
            orders.forEach((order: any) => {
              ordersMap.set(order.id, {
                city: order.recipient_city || undefined,
                state: order.recipient_state || undefined,
                country: order.recipient_country || undefined,
              });
            });
          }
        }

        // Transform videos to include location data from orders
        const videoData: VideoData[] = videos.map((video: any) => {
          const order = video.order_id ? ordersMap.get(video.order_id) : undefined;
          return {
            id: video.id,
            title: video.title || 'Untitled',
            created_at: video.created_at,
            order_id: video.order_id || undefined,
            order_city: order?.city,
            order_state: order?.state,
            order_country: order?.country,
          };
        });

        // Call GPT to categorize videos into vaults
        const vaultSuggestions = await categorizeVideosWithGPT(videoData);

        if (!vaultSuggestions || vaultSuggestions.length === 0) {
          console.log(`No vault suggestions for user ${userId}`);
          continue;
        }

        // Create/update vaults and vault_videos relationships
        await createOrUpdateVaults(supabase, userId, vaultSuggestions);

        console.log(`Successfully categorized ${videos.length} videos for user ${userId} into ${vaultSuggestions.length} vaults`);
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        // Continue with next user even if one fails
        continue;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${uniqueUserIds.length} users`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in categorize-vaults function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function categorizeVideosWithGPT(videos: VideoData[]): Promise<VaultSuggestion[]> {
  const systemMessage = `You are an AI assistant that categorizes video messages into themed vaults (collections).
Analyze the provided videos and group them into meaningful vaults based on:
1. Video titles - extract themes, occasions, relationships (e.g., "Birthday", "Anniversary", "Thank You")
2. Dates - identify time-based patterns (e.g., "This Month", "Last Year", "Summer 2023")
3. Time of year - detect recurring events like birthdays, anniversaries, holidays
4. Location - group by city, state, or country from shipping addresses

Respond with ONLY valid JSON: an array of objects with this structure:
[
  {
    "name": "Vault Name (e.g., 'Your Birthdays', 'Anniversaries', 'Summer Memories', 'California Trips')",
    "description": "Brief description (optional)",
    "category_type": "time-based" | "location-based" | "occasion-based" | "theme-based",
    "video_ids": ["video-id-1", "video-id-2", ...]
  }
]

Important rules:
- Each video can belong to multiple vaults
- Use descriptive, user-friendly vault names
- Group related videos together
- Consider seasonal patterns and recurring events
- Location-based vaults should use format like "California Memories" or "New York Trips"`;

  const now = new Date();
  const videosContext = videos
    .map((video) => {
      const date = new Date(video.created_at);
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      const location = [video.order_city, video.order_state, video.order_country]
        .filter(Boolean)
        .join(', ');

      return `- Video ID: ${video.id}
  Title: "${video.title}"
  Date: ${dateStr} (${month})
  ${location ? `Location: ${location}` : 'Location: Unknown'}`;
    })
    .join('\n');

  const userMessage = `Analyze these ${videos.length} video messages and categorize them into themed vaults:

${videosContext}

Group videos into meaningful vaults. Be creative but logical. Consider patterns in titles, dates, seasons, and locations.`;

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse JSON response (might be wrapped in code block or object)
    let jsonString = content.trim();
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```json\n?/, '').replace(/```$/, '');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      throw new Error(`Failed to parse JSON: ${jsonString.substring(0, 200)}`);
    }

    // Handle different response formats: direct array or object with vaults key
    let suggestions: any[] = [];
    if (Array.isArray(parsed)) {
      suggestions = parsed;
    } else if (parsed.vaults && Array.isArray(parsed.vaults)) {
      suggestions = parsed.vaults;
    } else if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
      suggestions = parsed.suggestions;
    } else if (parsed.data && Array.isArray(parsed.data)) {
      suggestions = parsed.data;
    } else {
      throw new Error('Invalid response format: expected array or object with vaults/suggestions/data key');
    }

    if (!Array.isArray(suggestions)) {
      throw new Error('Invalid response format: expected array');
    }

    // Validate and filter suggestions
    return suggestions
      .filter((v: any) => v.name && Array.isArray(v.video_ids) && v.video_ids.length > 0)
      .map((v: any) => ({
        name: String(v.name).trim(),
        description: v.description ? String(v.description).trim() : undefined,
        category_type: v.category_type || 'theme-based',
        video_ids: v.video_ids.filter((id: any) => videos.some((video) => video.id === id)),
      }))
      .filter((v: VaultSuggestion) => v.video_ids.length > 0);
  } catch (error) {
    console.error('Error calling GPT:', error);
    throw error;
  }
}

async function createOrUpdateVaults(
  supabase: any,
  userId: string,
  suggestions: VaultSuggestion[]
): Promise<void> {
  for (const suggestion of suggestions) {
    try {
      // Check if vault with this name already exists for this user
      const { data: existingVaults, error: findError } = await supabase
        .from('vaults')
        .select('id')
        .eq('user_id', userId)
        .eq('name', suggestion.name)
        .limit(1)
        .single();

      let vaultId: string;

      if (existingVaults && !findError) {
        // Update existing vault
        vaultId = existingVaults.id;
        const { error: updateError } = await supabase
          .from('vaults')
          .update({
            description: suggestion.description || null,
            category_type: suggestion.category_type,
            last_categorized_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', vaultId);

        if (updateError) {
          console.error(`Error updating vault ${vaultId}:`, updateError);
          continue;
        }

        // Remove old video associations for this vault
        await supabase.from('vault_videos').delete().eq('vault_id', vaultId);
      } else {
        // Create new vault
        const { data: newVault, error: createError } = await supabase
          .from('vaults')
          .insert({
            user_id: userId,
            name: suggestion.name,
            description: suggestion.description || null,
            category_type: suggestion.category_type,
            last_categorized_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (createError || !newVault) {
          console.error(`Error creating vault:`, createError);
          continue;
        }

        vaultId = newVault.id;
      }

      // Create vault_videos associations
      if (suggestion.video_ids.length > 0) {
        const vaultVideos = suggestion.video_ids.map((videoId) => ({
          vault_id: vaultId,
          video_message_id: videoId,
        }));

        const { error: insertError } = await supabase
          .from('vault_videos')
          .insert(vaultVideos);

        if (insertError) {
          console.error(`Error inserting vault_videos:`, insertError);
        }
      }
    } catch (error) {
      console.error(`Error processing vault "${suggestion.name}":`, error);
      continue;
    }
  }
}

