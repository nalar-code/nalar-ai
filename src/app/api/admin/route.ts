import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/security';

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    const { searchParams } = new URL(req.url);
    const requesterId = session?.userId || searchParams.get('requesterId');

    if (!requesterId) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { chats: true },
        },
      },
    });

    const totalMessages = await prisma.message.count();
    const totalChats = await prisma.chat.count();

    return NextResponse.json({
      stats: {
        totalUsers: users.length,
        totalChats,
        totalMessages,
        apiConfigured: !!(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY),
      },
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        plan: u.plan,
        dailyQuota: u.dailyQuota,
        jobTitle: u.jobTitle,
        organization: u.organization,
        chatCount: u._count.chats,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    console.error('Admin API Error:', error);
    return NextResponse.json({ error: 'Gagal memuat data admin' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { targetUserId, plan, role, dailyQuota } = await req.json();
    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID diperlukan' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...(plan ? { plan } : {}),
        ...(role ? { role } : {}),
        ...(typeof dailyQuota === 'number' ? { dailyQuota } : {}),
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memperbarui pengguna' }, { status: 500 });
  }
}
