import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { conversationId } = await request.json();

    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });
    }

    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    const messageList = (messages || []).map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      created_at: m.created_at,
    }));

    const { data: files } = await supabaseAdmin
      .from('files')
      .select('id, original_name, mime_type, supabase_path, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });

    const documentList = (files || []).map((f: any) => ({
      id: f.id,
      original_name: f.original_name,
      mime_type: f.mime_type,
      supabase_path: f.supabase_path,
      created_at: f.created_at,
    }));

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      messages: messageList,
      documents: documentList,
    });
  } catch (error) {
    console.error('Unexpected error in /api/data/conversations:', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
