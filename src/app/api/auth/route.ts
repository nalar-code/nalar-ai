import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  hashPasswordSecure,
  verifyPasswordSecure,
  signSessionToken,
  getServerSession,
  SESSION_COOKIE_NAME,
} from '@/lib/security';

function formatUserResponse(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'user',
    plan: user.plan || 'free',
    dailyQuota: user.dailyQuota ?? 30,
    jobTitle: user.jobTitle || 'Professional',
    organization: user.organization || 'Personal Workspace',
    bio: user.bio || '',
    avatarColor: user.avatarColor || 'zinc',
    createdAt: user.createdAt,
  };
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    return NextResponse.json({ user: formatUserResponse(user) });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const { action, name, email, password, jobTitle, organization } = await req.json();

    if (action === 'logout') {
      const res = NextResponse.json({ success: true });
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan kata sandi wajib diisi.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Kata sandi minimal 6 karakter.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (action === 'signup') {
      const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (existing) {
        return NextResponse.json({ error: 'Email sudah terdaftar. Silakan masuk.' }, { status: 400 });
      }

      // Pengguna pertama di database otomatis menjadi Admin & Pro!
      const totalUsers = await prisma.user.count();
      const isFirstUser = totalUsers === 0;

      const hashed = hashPasswordSecure(password);
      const newUser = await prisma.user.create({
        data: {
          name: name?.trim() || cleanEmail.split('@')[0],
          email: cleanEmail,
          passwordHash: hashed,
          role: isFirstUser ? 'admin' : 'user',
          plan: isFirstUser ? 'pro' : 'free',
          dailyQuota: isFirstUser ? 9999 : 30,
          jobTitle: jobTitle?.trim() || (isFirstUser ? 'Workspace Owner' : 'Professional'),
          organization: organization?.trim() || 'NALAR Enterprise',
        },
      });

      const token = signSessionToken(newUser.id, newUser.email);
      const res = NextResponse.json({ user: formatUserResponse(newUser) });
      res.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 14,
      });
      return res;
    }

    if (action === 'login') {
      const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (!user || !verifyPasswordSecure(password, user.passwordHash)) {
        return NextResponse.json({ error: 'Kredensial email atau kata sandi tidak sesuai.' }, { status: 401 });
      }

      if (!user.passwordHash.startsWith('pbkdf2:')) {
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: hashPasswordSecure(password) },
        });
      }

      const token = signSessionToken(user.id, user.email);
      const res = NextResponse.json({ user: formatUserResponse(user) });
      res.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 14,
      });
      return res;
    }

    return NextResponse.json({ error: 'Aksi tidak valid.' }, { status: 400 });
  } catch (error: any) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Layanan autentikasi sedang sibuk. Pastikan koneksi database aktif.' },
      { status: 500 }
    );
  }
}
