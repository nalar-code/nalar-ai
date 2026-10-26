import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (chatId) {
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      return NextResponse.json(chat);
    }

    const chats = await prisma.chat.findMany({
      where: userId ? { userId } : {},
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      select: { id: true, title: true, model: true, isPinned: true, updatedAt: true },
    });
    return NextResponse.json(chats);
  } catch (error) {
    console.error('Gagal mengambil riwayat chat:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { chatId, isPinned, title } = await req.json();
    if (!chatId) return NextResponse.json({ error: 'Chat ID diperlukan' }, { status: 400 });

    const updated = await prisma.chat.update({
      where: { id: chatId },
      data: {
        ...(typeof isPinned === 'boolean' ? { isPinned } : {}),
        ...(title ? { title } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memperbarui chat' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (chatId) {
      await prisma.chat.delete({ where: { id: chatId } });
    } else if (userId) {
      await prisma.chat.deleteMany({ where: { userId } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal menghapus chat' }, { status: 500 });
  }
}
