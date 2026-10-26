import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'nalar_salt_2026').digest('hex');
}

export async function POST(req: Request) {
  try {
    const { action, name, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan kata sandi wajib diisi.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const hashed = hashPassword(password);

    if (action === 'signup') {
      const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (existing) {
        return NextResponse.json({ error: 'Email sudah terdaftar. Silakan masuk (Login).' }, { status: 400 });
      }

      const newUser = await prisma.user.create({
        data: {
          name: name?.trim() || cleanEmail.split('@')[0],
          email: cleanEmail,
          passwordHash: hashed,
        },
      });

      return NextResponse.json({
        user: { id: newUser.id, name: newUser.name, email: newUser.email },
      });
    }

    if (action === 'login') {
      const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (!user || user.passwordHash !== hashed) {
        return NextResponse.json({ error: 'Email atau kata sandi salah.' }, { status: 401 });
      }

      return NextResponse.json({
        user: { id: user.id, name: user.name, email: user.email },
      });
    }

    return NextResponse.json({ error: 'Aksi tidak valid.' }, { status: 400 });
  } catch (error: any) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Layanan autentikasi sedang sibuk. Pastikan DATABASE_URL sudah diatur di Vercel.' },
      { status: 500 }
    );
  }
}
