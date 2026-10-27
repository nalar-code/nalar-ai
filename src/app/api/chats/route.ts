import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/security';

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('id');
    const userId = session?.userId || searchParams.get('userId');

    if (!userId) {
      return NextResponse.json([], { status: 200 });
    }

    if (chatId) {
      const chat = await prisma.chat.findFirst({
        where: { id: chatId, userId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      return NextResponse.json(chat);
    }

    const chats = await prisma.chat.findMany({
      where: { userId },
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
    const session = await getServerSession();
    const { chatId, isPinned, title, userId: bodyUserId } = await req.json();
    const userId = session?.userId || bodyUserId;

    if (!chatId || !userId) return NextResponse.json({ error: 'Akses tidak valid' }, { status: 400 });

    const updated = await prisma.chat.updateMany({
      where: { id: chatId, userId },
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
    const session = await getServerSession();
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('id');
    const userId = session?.userId || searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    if (chatId) {
      await prisma.chat.deleteMany({ where: { id: chatId, userId } });
    } else {
      await prisma.chat.deleteMany({ where: { userId } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: true });
  }
}
