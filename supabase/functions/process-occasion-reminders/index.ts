// process-occasion-reminders/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
              .from('user_notifications')
              .insert({
                user_id,
                title: title,
                body: message,
                metadata: {
                  occasion_id: occ.id,
                  type: 'occasion_reminder',
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
