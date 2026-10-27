import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getServerSession,
  hashPasswordSecure,
  verifyPasswordSecure,
  SESSION_COOKIE_NAME,
} from '@/lib/security';

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    const body = await req.json();
    const userId = session?.userId || body.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Sesi tidak valid. Silakan login kembali.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    if (body.action === 'change_password') {
      const { currentPassword, newPassword } = body;
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: 'Kata sandi lama dan baru wajib diisi.' }, { status: 400 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Kata sandi baru minimal 6 karakter.' }, { status: 400 });
      }
      const isValid = verifyPasswordSecure(currentPassword, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: 'Kata sandi saat ini tidak sesuai.' }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashPasswordSecure(newPassword) },
      });

      return NextResponse.json({ message: 'Kata sandi berhasil diperbarui dengan enkripsi PBKDF2.' });
    }

    const { name, jobTitle, organization, bio, avatarColor } = body;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(typeof jobTitle === 'string' ? { jobTitle: jobTitle.trim() } : {}),
        ...(typeof organization === 'string' ? { organization: organization.trim() } : {}),
        ...(typeof bio === 'string' ? { bio: bio.trim() } : {}),
        ...(avatarColor ? { avatarColor } : {}),
      },
    });

    return NextResponse.json({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        plan: updated.plan,
        dailyQuota: updated.dailyQuota,
        jobTitle: updated.jobTitle,
        organization: updated.organization,
        bio: updated.bio,
        avatarColor: updated.avatarColor,
        createdAt: updated.createdAt,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui profil pengguna.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    const { searchParams } = new URL(req.url);
    const userId = session?.userId || searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Tidak memiliki akses.' }, { status: 401 });
    }

    await prisma.user.deleteMany({ where: { id: userId } });
    const res = NextResponse.json({ success: true });
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  } catch {
    return NextResponse.json({ error: 'Gagal menghapus akun.' }, { status: 500 });
  }
}
