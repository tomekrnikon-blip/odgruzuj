import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[CLEANUP-UNCONFIRMED] ${step}`, details ? JSON.stringify(details) : '');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    logStep('Starting cleanup of unconfirmed users older than 24 hours');

    // Find unconfirmed users (user_number IS NULL) older than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: unconfirmedUsers, error: fetchError } = await supabase
      .from('profiles')
      .select('user_id, email, created_at')
      .is('user_number', null)
      .lt('created_at', twentyFourHoursAgo);

    if (fetchError) {
      logStep('Error fetching unconfirmed users', { error: fetchError.message });
      throw fetchError;
    }

    if (!unconfirmedUsers || unconfirmedUsers.length === 0) {
      logStep('No unconfirmed users to clean up');
      return new Response(
        JSON.stringify({ success: true, deleted: 0, message: 'No unconfirmed users to clean up' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Found unconfirmed users to delete', { count: unconfirmedUsers.length });

    const userIds = unconfirmedUsers.map(u => u.user_id);
    let deletedCount = 0;

    for (const userId of userIds) {
      try {
        // Delete from all related tables
        await supabase.from('user_notifications').delete().eq('user_id', userId);
        await supabase.from('user_progress').delete().eq('user_id', userId);
        await supabase.from('completed_tasks').delete().eq('user_id', userId);
        await supabase.from('user_flashcards').delete().eq('user_id', userId);
        await supabase.from('support_messages').delete().eq('user_id', userId);
        await supabase.from('push_subscriptions').delete().eq('user_id', userId);
        await supabase.from('user_roles').delete().eq('user_id', userId);
        
        // Delete the profile
        const { error: deleteError } = await supabase
          .from('profiles')
          .delete()
          .eq('user_id', userId);

        if (deleteError) {
          logStep('Error deleting profile', { userId, error: deleteError.message });
        } else {
          deletedCount++;
          logStep('Deleted unconfirmed user', { userId });
        }

        // Delete from auth.users using admin API
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
        if (authDeleteError) {
          logStep('Error deleting auth user', { userId, error: authDeleteError.message });
        }
      } catch (err) {
        logStep('Error processing user deletion', { userId, error: String(err) });
      }
    }

    logStep('Cleanup completed', { deletedCount });

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted: deletedCount,
        message: `Cleaned up ${deletedCount} unconfirmed users` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logStep('Fatal error', { error: String(error) });
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
