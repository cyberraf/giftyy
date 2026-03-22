// process-occasion-reminders/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Inlined from _shared/auth.ts (dashboard deployment doesn't bundle _shared/)
function verifyServiceRole(req: Request): { authorized: boolean; error?: string } {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return { authorized: false, error: 'Missing Authorization header' }
  try {
    const token = authHeader.replace('Bearer ', '')
    const parts = token.split('.')
    if (parts.length !== 3) return { authorized: false, error: 'Invalid token format' }
    const payload = JSON.parse(atob(parts[1]))
    if (payload.role !== 'service_role') return { authorized: false, error: 'Forbidden: service_role required' }
    return { authorized: true }
  } catch { return { authorized: false, error: 'Invalid authorization token' } }
}

function unauthorizedResponse(message: string, corsHeaders: Record<string, string>, status = 401): Response {
  return new Response(JSON.stringify({ error: message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status })
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verify caller has service_role authorization (scheduled/internal calls only)
  const { authorized, error: authError } = verifyServiceRole(req)
  if (!authorized) {
    return unauthorizedResponse(authError || 'Forbidden', corsHeaders, 403)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('[process-occasion-reminders] Starting daily check...');

    // 1. Fetch all users with occasion reminders enabled
    const { data: users, error: userError } = await supabase
      .from('user_settings')
      .select('user_id, reminder_days_before')
      .eq('occasion_reminders_enabled', true);

    if (userError) throw userError;
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: 'No users with reminders enabled.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let notificationsCreated = 0;
    const today = new Date();
    // Use UTC for consistent date math
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    console.log(`[process-occasion-reminders] Processing ${users.length} users...`);

    for (const user of users) {
      const { user_id, reminder_days_before } = user;

      // 2. Fetch occasions for this user joined with recipient name
      const { data: occasions, error: occError } = await supabase
        .from('occasions')
        .select(`
          id, 
          title, 
          date, 
          recurrence_pattern,
          recipient:recipient_profile_id (
            full_name
          )
        `)
        .eq('user_id', user_id);

      if (occError) {
        console.error(`Error fetching occasions for user ${user_id}:`, occError);
        continue;
      }

      for (const occ of occasions) {
        const occDate = new Date(occ.date);
        const recipientName = occ.recipient?.full_name || 'Someone';

        for (const daysBefore of (reminder_days_before || [7])) {
          let isMatch = false;
          let message = '';

          // Target date is today + daysBefore
          const targetDate = new Date(todayUTC);
          targetDate.setUTCDate(targetDate.getUTCDate() + daysBefore);

          if (occ.recurrence_pattern === 'yearly') {
            // Match month and day
            if (occDate.getUTCMonth() === targetDate.getUTCMonth() && 
                occDate.getUTCDate() === targetDate.getUTCDate()) {
              isMatch = true;
            }
          } else {
            // One-time: match full date
            if (occDate.getUTCFullYear() === targetDate.getUTCFullYear() &&
                occDate.getUTCMonth() === targetDate.getUTCMonth() &&
                occDate.getUTCDate() === targetDate.getUTCDate()) {
              isMatch = true;
            }
          }

          if (isMatch) {
            const timePhrase = daysBefore === 0 ? 'today!' : `in ${daysBefore} days!`;
            const title = daysBefore === 0 ? `It's ${occ.title} today! 🥳` : `Upcoming ${occ.title}! 🎁`;
            message = `${occ.title} for ${recipientName} is ${timePhrase}`;

            console.log(`[process-occasion-reminders] MATCH: User ${user_id}, Occasion ${occ.title}, ${daysBefore} days before.`);

            // 3. Create In-App Notification
            const { error: notifyError } = await supabase
              .from('notifications')
              .insert({
                user_id,
                title: title,
                body: message,
                type: 'occasion_reminder',
                data: {
                  occasion_id: occ.id,
                  days_before: daysBefore
                }
              });

            if (notifyError) {
              console.error(`Error creating in-app notification for user ${user_id}:`, notifyError);
            } else {
              notificationsCreated++;
            }

            // 4. Trigger Push Notification
            // We call the existing send-push-notification function
            try {
              const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`
                },
                body: JSON.stringify({
                  userId: user_id,
                  title: title,
                  body: message,
                  categoryId: 'occasion_reminder',
                  data: {
                    occasionId: occ.id,
                    type: 'occasion_reminder'
                  }
                })
              });
              
              if (!pushResponse.ok) {
                const errText = await pushResponse.text();
                console.warn(`Push notification failed for user ${user_id}: ${errText}`);
              }
            } catch (pushErr) {
              console.error(`Error calling push notification service for user ${user_id}:`, pushErr);
            }
          }
        }
      }
    }

    console.log(`[process-occasion-reminders] Done. Created ${notificationsCreated} notifications.`);

    return new Response(JSON.stringify({ 
      success: true, 
      notificationsCreated 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[process-occasion-reminders] Global Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
