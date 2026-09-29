# LOGARACING: Tantangan Logaritma

Game edukasi matematika SMA bernuansa F1 dengan empat alur: pemilihan peran, garage siswa, control room guru, dan cockpit siswa. Tampilan memakai light mode dengan telemetri neon, lintasan SVG berkelok, animasi tombol, leaderboard realtime, satu lap, dan target 10 jawaban benar.

## Jalankan lokal

```bash
npm install
cp .env.example .env.local
npm run dev
```

Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dengan URL dan legacy anon/publishable key dari proyek Supabase `logaracing`. Tanpa env Supabase, aplikasi tetap dapat dipreview untuk tampilan, tetapi daftar siswa realtime dan login guru tidak berjalan.

## Login guru

Kredensial guru disimpan sebagai hash di schema private Supabase dan diverifikasi melalui RPC. UI hanya menampilkan form username dan password; kredensial tidak ditulis ke source code frontend.

## Aturan game

- Guru menekan `MULAI BALAPAN` dari ruang kendali.
- Siswa mengerjakan 10 soal awal. Jawaban benar menambah skor dan memajukan mobil.
- Soal yang salah dikumpulkan dan diulang setelah 10 soal awal sampai skor mencapai 10.
- Leaderboard menampilkan siswa yang sedang online lewat Supabase Realtime Presence.
- Sesi dihentikan saat 10 siswa pertama mencapai finish.

## Referensi teknis

Implementasi mengikuti pola Vite env (`import.meta.env`), Supabase JS `createClient`, Realtime Presence/Broadcast dengan cleanup pada React effect, dan RLS pada tabel yang diekspos melalui Data API.
