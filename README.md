# NALAR AI — Full-Stack Serverless Cloud Edition

Aplikasi chatbot AI lengkap dengan branding **NALAR**, dibangun menggunakan **Next.js App Router**, **Vercel AI SDK (OpenAI)**, dan **PostgreSQL (Prisma ORM)**. Dirancang agar berjalan 24 jam penuh di Cloud (Vercel + Neon.tech) tanpa perlu menyalakan PC atau Docker.

## Cara Deploy 5 Menit (Tanpa Terminal / Tanpa Docker)

1. **Ekstrak File ZIP ini** di komputer Anda.
2. **Buat Repository Baru di GitHub:**
   - Buka [github.com/new](https://github.com/new), beri nama `nalar-ai`, pilih **Private**, dan centang **Add a README file**.
   - Klik **Add file > Upload files**, lalu seret (*drag & drop*) semua isi di dalam folder hasil ekstrak (`package.json`, `prisma`, `src`, dll.) ke dalam GitHub, lalu klik **Commit changes**.
3. **Buat Database PostgreSQL Gratis di Neon.tech:**
   - Buka [neon.tech](https://neon.tech), buat project `nalar-db` (pilih region Singapore).
   - Salin `DATABASE_URL` (Connection String PostgreSQL).
4. **Deploy ke Vercel (Aktif 24 Jam):**
   - Buka [vercel.com](https://vercel.com), klik **Add New > Project**, lalu *Import* repository `nalar-ai`.
   - Tambahkan **Environment Variables**:
     - `OPENAI_API_KEY` = API Key OpenAI Anda (`sk-proj-...`)
     - `DATABASE_URL` = URL PostgreSQL dari Neon.tech
   - Klik **Deploy** dan tunggu 1-2 menit hingga website NALAR AI Anda live!
