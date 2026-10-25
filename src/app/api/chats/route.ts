import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('id');

    if (chatId) {
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      return NextResponse.json(chat);
    }

    const chats = await prisma.chat.findMany({
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, model: true, updatedAt: true },
    });
    return NextResponse.json(chats);
  } catch (error) {
    console.error('Gagal mengambil riwayat chat:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('id');

    if (chatId) {
      await prisma.chat.delete({ where: { id: chatId } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal menghapus chat' }, { status: 500 });
  }
}
