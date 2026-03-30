import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, company_name, website, profile_image_path, referral_source, role')
      .eq('role', 'client');

    if (profileError) {
      console.error('Error fetching users:', profileError);
      return NextResponse.json([], { status: 200 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const usersWithStats = await Promise.all(
      profiles.map(async (profile: any) => {
        const { data: userConversations } = await supabaseAdmin
          .from('conversations')
          .select('id, created_at')
          .eq('user_id', profile.id);

        const conversationIds = (userConversations || []).map((c: any) => c.id);

        const { count: convCount } = await supabaseAdmin
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id);

        let msgCount = 0;
        if (conversationIds.length > 0) {
          const { count } = await supabaseAdmin
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .in('conversation_id', conversationIds);
          msgCount = count || 0;
        }

        const { count: docCount } = await supabaseAdmin
          .from('files')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id);

        let lastActivity = null;
        if (conversationIds.length > 0) {
          const { data: lastMessage } = await supabaseAdmin
            .from('messages')
            .select('created_at')
            .in('conversation_id', conversationIds)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          lastActivity = lastMessage?.created_at || null;
        }

        return {
          user_id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          company_name: profile.company_name ?? null,
          website: profile.website ?? null,
          profile_image_path: profile.profile_image_path ?? null,
          referral_source: profile.referral_source ?? null,
          total_conversations: convCount || 0,
          total_messages: msgCount,
          total_documents: docCount || 0,
          last_activity: lastActivity,
        };
      })
    );

    usersWithStats.sort((a, b) => {
      if (!a.last_activity) return 1;
      if (!b.last_activity) return -1;
      return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
    });

    return NextResponse.json(usersWithStats);
  } catch (error) {
    console.error('Unexpected error in /api/data/users:', error);
    return NextResponse.json([], { status: 500 });
  }
}
