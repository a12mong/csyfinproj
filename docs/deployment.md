# คู่มือ Deploy บน DigitalOcean Droplet (Docker)

> ติดตั้งครั้งแรก? ใช้ [setup-guide.md](setup-guide.md) — คู่มือละเอียดทีละคลิก ตั้งแต่สร้าง droplet, ผูก domain (DO DNS/Cloudflare), ตั้งค่า GitHub จนเว็บใช้งานได้จริง — ไฟล์นี้เน้นภาพรวมสถาปัตยกรรมและการดูแลระบบ

สถาปัตยกรรมบน droplet — ทุกอย่างรันเป็น container ผ่าน docker compose ที่ `/opt/csyfinproj`:

```
                    ┌──────────────────────── droplet ────────────────────────┐
 internet ──80/443──▶ Caddy ──┬── /api/* , /uploads/* ──▶ api (Express :4000) │
                    │         └── อื่น ๆ ───────────────▶ web (Next.js :3000) │
                    │                    api ──▶ db (MySQL 8.4 :3306, ภายใน)  │
                    └─────────────────────────────────────────────────────────┘
```

- **Caddy** เป็น reverse proxy ตัวเดียวที่เปิดสู่ internet → web กับ api อยู่ **origin เดียวกัน** (ไม่มีปัญหา CORS/cookie ข้ามโดเมน) และถ้ามี domain จะได้ **HTTPS อัตโนมัติ** (Let's Encrypt)
- ไฟล์อัปโหลด (`uploads`, `secure-uploads`) และข้อมูล MySQL อยู่ใน **named volume** — รอด `docker compose down` / image update
- CI (GitHub Actions) build image → push ขึ้น **GHCR** → ssh เข้า droplet → `docker compose pull` → sync DB schema → `up -d`

## ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|---|---|
| [apps/api/Dockerfile](../apps/api/Dockerfile) | image ของ API (multi-stage, pnpm, มี prisma CLI สำหรับ sync schema) |
| [apps/web/Dockerfile](../apps/web/Dockerfile) | image ของ Web (Next.js standalone) — `NEXT_PUBLIC_*` ถูกฝังตอน build |
| [deploy/docker-compose.yml](../deploy/docker-compose.yml) | stack ที่รันบน droplet (db / api / web / caddy) |
| [deploy/Caddyfile](../deploy/Caddyfile) | กติกา reverse proxy |
| [deploy/.env.example](../deploy/.env.example) | ต้นแบบ `.env` บน droplet |
| [deploy/setup-server.sh](../deploy/setup-server.sh) | เตรียม droplet ครั้งแรก (docker, swap, ufw) |
| [deploy/docker-compose.local.yml](../deploy/docker-compose.local.yml) | overlay สำหรับ build/ทดสอบ stack production บนเครื่องตัวเอง |
| [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) | CI/CD: build → push GHCR → deploy ผ่าน SSH |

## ขั้นตอนติดตั้งครั้งแรก

### 1. สร้าง droplet

- Ubuntu 24.04 LTS, แนะนำ **2 GB RAM ขึ้นไป** (1 GB พอไหวเพราะ build เกิดบน CI ไม่ใช่บน server แต่ MySQL + Node สองตัวจะตึง; script มีการเปิด swap 2G ช่วยอยู่แล้ว)
- ผูก SSH key ของคุณตอนสร้าง
- ถ้ามี domain: ชี้ A record ของ เช่น `app.example.com` → IP ของ droplet ก่อนเริ่ม (Caddy ต้องใช้ตอนออก cert)

### 2. เตรียมเครื่อง

```bash
ssh root@<droplet-ip>
# วางไฟล์ deploy/setup-server.sh แล้วรัน:
bash setup-server.sh
```

script จะติดตั้ง docker, เปิด swap 2G, ตั้ง ufw (เปิดแค่ SSH/80/443) และสร้าง `/opt/csyfinproj`

### 3. สร้าง `.env` บน droplet

```bash
cd /opt/csyfinproj
nano .env   # วางเนื้อหาจาก deploy/.env.example แล้วกรอกให้ครบ
```

ค่าสำคัญ: `GHCR_OWNER` (ชื่อ GitHub ตัวพิมพ์เล็ก), `SITE_ADDRESS`, `CORS_ORIGIN`, `PUBLIC_API_URL`, รหัสผ่าน MySQL ทั้งสอง, `JWT_SECRET` (`openssl rand -base64 48`) และคีย์ LINE/SMS/SMTP

> ⚠️ **ต้องมี HTTPS จริงจึงจะ login ได้** — โค้ด production ตั้ง cookie เป็น `secure + SameSite=None` ถ้ารันแบบ `SITE_ADDRESS=:80` (HTTP ผ่าน IP) browser จะทิ้ง cookie และ login ไม่ติด ใช้ domain + HTTPS ตั้งแต่แรกจะจบปัญหานี้

### 4. สร้าง SSH key สำหรับ CI

```bash
# บนเครื่องคุณ (หรือบน droplet ก็ได้)
ssh-keygen -t ed25519 -f deploy_key -C csyfinproj-deploy -N ""
# เอา public key ไปต่อท้ายบน droplet:
cat deploy_key.pub >> ~/.ssh/authorized_keys   # ของ user ที่ใช้ deploy (root หรือ user ที่อยู่กลุ่ม docker)
```

### 5. ตั้ง Secrets / Variables ใน GitHub repo

**Settings → Secrets and variables → Actions**

| Secret | ค่า |
|---|---|
| `DEPLOY_HOST` | IP หรือ hostname ของ droplet |
| `DEPLOY_USER` | user ที่ ssh เข้า (เช่น `root`) |
| `DEPLOY_SSH_KEY` | เนื้อหาไฟล์ `deploy_key` (private key ทั้งไฟล์) |
| `DEPLOY_PORT` | (ไม่บังคับ) พอร์ต SSH ถ้าไม่ใช่ 22 |
| `GHCR_PAT` | Personal Access Token (classic) ที่มีสิทธิ์ `read:packages` — droplet ใช้ login GHCR เพื่อ pull image |

| Variable | ค่า (ตัวอย่าง) |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://app.example.com/api/v1` |
| `NEXT_PUBLIC_LIFF_ID` | LIFF ID ของ LINE |

> `NEXT_PUBLIC_*` ถูก**ฝังลง bundle ของเว็บตอน build** — ถ้าเปลี่ยนค่า ต้อง build ใหม่ (push หรือกด Run workflow)

### 6. Deploy ครั้งแรก

push ขึ้น `main` หรือกด **Actions → Build & Deploy → Run workflow** — workflow จะ:

1. build image `csyfinproj-api` / `csyfinproj-web` แล้ว push ขึ้น GHCR (tag `latest` + commit SHA)
2. scp `deploy/docker-compose.yml` + `Caddyfile` ไป `/opt/csyfinproj`
3. ssh เข้าไป: login GHCR → เขียน `IMAGE_TAG=<sha>` ลง `.env` → `docker compose pull` → start db → `prisma db push` → `up -d`

### 7. Seed ข้อมูลเริ่มต้น (ครั้งแรกเท่านั้น)

seed script ใช้ devDependencies (tsx/faker) ซึ่งไม่อยู่ใน image — รันจากเครื่องคุณผ่าน SSH tunnel แทน (พอร์ต db ถูก bind ไว้ที่ `127.0.0.1` ของ droplet เท่านั้น):

```bash
ssh -N -L 3307:127.0.0.1:3306 <user>@<droplet-ip> &   # เปิด tunnel ค้างไว้
DATABASE_URL="mysql://csyfin:<MYSQL_PASSWORD>@127.0.0.1:3307/csyfinproj" \
  pnpm --filter @csyfinproj/api seed
```

### 8. อัปเดต LINE webhook

หลังระบบขึ้นแล้ว ตั้งค่า webhook ใน LINE Developers Console เป็น `https://<domain>/api/v1/webhooks/line` (ดูได้จากหน้า settings ของระบบ ซึ่งอ่านจาก `PUBLIC_API_URL`)

## เรื่อง Database schema: `db push` ไม่ใช่ `migrate deploy`

โปรเจกต์นี้ใช้ **`prisma db push`** เป็น convention (โฟลเดอร์ `prisma/migrations` มี drift กับ DB dev แล้ว) CI จึง sync schema ด้วย `db push` เช่นกัน โดย**ไม่ใส่** `--accept-data-loss`:

- การเปลี่ยน schema แบบปกติ (เพิ่มตาราง/คอลัมน์) → ผ่านอัตโนมัติ
- การเปลี่ยนแบบทำลายข้อมูล (ลบ/เปลี่ยนชนิดคอลัมน์) → step นี้ **fail และระบบเวอร์ชันเก่ายังรันต่อ** — ตั้งใจให้เป็นแบบนั้น ให้เข้าไปจัดการเอง เช่น backup แล้วรัน `docker compose run --rm api npx prisma db push --skip-generate --accept-data-loss` บน droplet

ระยะยาวถ้าอยากกลับมาใช้ migration จริง ให้ reconcile migrations ใหม่ (`prisma migrate diff` → สร้าง baseline) แล้วเปลี่ยนคำสั่งใน workflow เป็น `prisma migrate deploy`

## คำสั่งดูแลระบบที่ใช้บ่อย (บน droplet, ใน `/opt/csyfinproj`)

```bash
docker compose ps                      # สถานะ + health
docker compose logs -f api             # ดู log (api / web / db / caddy)
docker compose restart api             # restart ทีละ service
docker compose down && docker compose up -d   # restart ทั้ง stack (data อยู่ใน volume ไม่หาย)
```

**Rollback** — ชี้ `IMAGE_TAG` กลับไปที่ commit SHA เดิมใน `.env` แล้ว `docker compose pull && docker compose up -d` (schema ไม่ rollback อัตโนมัติ)

**Backup MySQL** (แนะนำตั้ง cron รายวัน):

```bash
docker compose exec db sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction csyfinproj' \
  | gzip > /opt/csyfinproj/backup-$(date +%F).sql.gz
```

**Backup ไฟล์อัปโหลด**: volume `csyfinproj_uploads` และ `csyfinproj_secure_uploads` (`docker run --rm -v csyfinproj_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads.tar.gz -C /data .`)

## ทดสอบ stack production บนเครื่องตัวเองก่อน deploy

```bash
cd deploy
cp .env.example .env        # ใส่ค่า dummy, SITE_ADDRESS=:80
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
# เปิด http://localhost  (หมายเหตุ: login ไม่ติดใน NODE_ENV=production ผ่าน HTTP — ดูข้อ 3)
```
