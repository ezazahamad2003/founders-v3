import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, company_name, role, created_at')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: conversations } = await supabaseAdmin
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    const conversationList = await Promise.all(
      (conversations || []).map(async (c: any) => {
        const { count } = await supabaseAdmin
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', c.id);

        return {
          id: c.id,
          title: c.title,
          message_count: count || 0,
          created_at: c.created_at,
          updated_at: c.updated_at,
        };
      })
    );

    const { data: documents } = await supabaseAdmin
      .from('files')
      .select('id, original_name, mime_type, supabase_path, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const documentList = (documents || []).map((d: any) => ({
      id: d.id,
      original_name: d.original_name,
      mime_type: d.mime_type,
      supabase_path: d.supabase_path,
      created_at: d.created_at,
    }));

    const { count: totalMessages } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', (conversations || []).map((c: any) => c.id));

    return NextResponse.json({
      user_id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      company_name: profile.company_name,
      role: profile.role,
      created_at: profile.created_at,
      total_conversations: conversationList.length,
      total_messages: totalMessages || 0,
      total_documents: documentList.length,
      conversations: conversationList,
      documents: documentList,
    });
  } catch (error) {
    console.error('Unexpected error in /api/data/users/detail:', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
