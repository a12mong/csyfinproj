# Setup Guide ละเอียดทุกขั้นตอน: Deploy ระบบขึ้น DigitalOcean Droplet จนใช้งานได้จริง

> คู่มือนี้พาทำตั้งแต่ศูนย์ — สร้าง droplet, ผูก domain, ตั้งค่า GitHub Actions — จนเปิดเว็บใช้งานผ่าน HTTPS ได้จริง
> ภาพรวมสถาปัตยกรรมและคำสั่งดูแลระบบอยู่ที่ [deployment.md](deployment.md)
>
> **เวลาโดยประมาณ:** 1–2 ชั่วโมง (รวมเวลารอ DNS)
> **ค่าใช้จ่าย:** droplet ~$12/เดือน (2GB) + domain ~$10/ปี — Cloudflare/GHCR/Let's Encrypt ฟรี

## สารบัญ

- [Phase 0: สิ่งที่ต้องมีก่อนเริ่ม](#phase-0-สิ่งที่ต้องมีก่อนเริ่ม)
- [Phase 1: ซื้อ domain](#phase-1-ซื้อ-domain)
- [Phase 2: สร้าง Droplet](#phase-2-สร้าง-droplet)
- [Phase 3: ผูก domain เข้ากับ droplet](#phase-3-ผูก-domain-เข้ากับ-droplet)
- [Phase 4: เตรียมเครื่อง server](#phase-4-เตรียมเครื่อง-server)
- [Phase 5: สร้างไฟล์ .env บน server](#phase-5-สร้างไฟล์-env-บน-server)
- [Phase 6: ตั้งค่า GitHub (secrets / variables / PAT)](#phase-6-ตั้งค่า-github)
- [Phase 7: Deploy ครั้งแรก](#phase-7-deploy-ครั้งแรก)
- [Phase 8: Seed ข้อมูลเริ่มต้น](#phase-8-seed-ข้อมูลเริ่มต้น)
- [Phase 9: ตั้งค่า LINE (LIFF + Webhook)](#phase-9-ตั้งค่า-line)
- [Phase 10: หลังระบบขึ้นแล้ว (backup ฯลฯ)](#phase-10-หลังระบบขึ้นแล้ว)
- [Phase 11 (ทางเลือก): แยก instance dev กับ live](#phase-11-ทางเลือก-แยก-instance-dev-กับ-live)
- [Troubleshooting](#troubleshooting)

---

## Phase 0: สิ่งที่ต้องมีก่อนเริ่ม

| สิ่งที่ต้องมี | หมายเหตุ |
|---|---|
| บัญชี [DigitalOcean](https://www.digitalocean.com) | ต้องผูกบัตรเครดิต/PayPal |
| บัญชี GitHub ที่มี repo นี้ push อยู่ | โค้ดต้องมีโฟลเดอร์ `deploy/` และ `.github/workflows/deploy.yml` แล้ว |
| บัญชี [Cloudflare](https://dash.cloudflare.com/sign-up) (ถ้าเลือกใช้ Cloudflare จัดการ DNS) | ฟรี |
| LINE Developers Console เข้าถึง channel ของร้าน | สำหรับ Phase 9 |
| เครื่อง Mac/Linux ที่มี terminal + ssh | ที่ใช้อยู่ตอนนี้ |

**เช็คว่าโค้ดพร้อม:** ไฟล์ทั้งหมดนี้ต้องถูก commit + push ขึ้น branch `main` แล้ว

```bash
git add apps/api/Dockerfile apps/web/Dockerfile .dockerignore deploy/ .github/ docs/ \
        apps/api/package.json apps/api/src/index.ts apps/web/next.config.js pnpm-lock.yaml
git commit -m "chore: docker + CI deployment setup"
# อย่าเพิ่ง push! — push ตอน Phase 7 เพราะ push แล้ว workflow จะรันทันที
```

---

## Phase 1: ซื้อ domain

ถ้ามี domain อยู่แล้ว ข้ามไป Phase 2 ได้เลย

ตัวเลือกแนะนำ (เรียงตามความคุ้ม):

1. **Cloudflare Registrar** — ขายราคาทุน (.com ~$10/ปี ไม่มีบวกเพิ่มปีถัดไป) แต่**ต้องมีบัญชี Cloudflare ก่อน** และ DNS จะถูกบังคับใช้ของ Cloudflare (ซึ่งเราจะใช้อยู่แล้ว): เข้า [dash.cloudflare.com](https://dash.cloudflare.com) → เมนูซ้าย **Domain Registration → Register Domains** → พิมพ์ชื่อที่ต้องการ → ชำระเงิน
2. **Namecheap / Porkbun** — ราคาโปรปีแรกถูก (.xyz/.online หลักสิบบาท) ใช้ได้เหมือนกัน
3. ผู้ให้บริการไทย (เช่น z.com) — จ่ายผ่านช่องทางไทยได้

สมมติในคู่มือนี้ว่าได้ domain มาคือ **`example.com`** และจะใช้ subdomain **`app.example.com`** สำหรับระบบ (แทนที่ด้วยของจริงทุกจุด)

---

## Phase 2: สร้าง Droplet

### 2.1 เพิ่ม SSH key เข้าบัญชี DigitalOcean (ทำครั้งเดียว)

1. บนเครื่องคุณ เช็คว่ามี key อยู่แล้วไหม: `cat ~/.ssh/id_ed25519.pub` — ถ้าไม่มี สร้างใหม่:
   ```bash
   ssh-keygen -t ed25519 -C "your-email@example.com"
   # กด Enter รับค่า default ทั้งหมด (ตั้ง passphrase หรือไม่ก็ได้)
   cat ~/.ssh/id_ed25519.pub   # copy ผลลัพธ์ทั้งบรรทัด
   ```
2. เข้า [cloud.digitalocean.com](https://cloud.digitalocean.com) → เมนูซ้ายล่าง **Settings** → แท็บ **Security** → ปุ่ม **Add SSH Key** → วาง public key → ตั้งชื่อ (เช่น `macbook`) → **Add SSH Key**

### 2.2 สร้าง droplet

1. มุมขวาบนกดปุ่มเขียว **Create** → เลือก **Droplets**
2. **Choose Region:** เลือก **Singapore (SGP1)** — ใกล้ไทยที่สุด ping ต่ำสุด
3. **Choose an image:** แท็บ **OS** → **Ubuntu** → version **24.04 (LTS) x64**
4. **Choose Size:**
   - **Droplet Type:** Basic
   - **CPU options:** Regular (Disk type: SSD)
   - เลือกแผน **$12/mo — 2 GB RAM / 1 vCPU / 50 GB SSD** ← แนะนำ
   - (ประหยัดสุด $6/mo 1GB ก็รันได้เพราะเรา build บน CI ไม่ใช่บนเครื่อง และ setup script เปิด swap ให้ แต่ MySQL จะตึง — อัปเกรดทีหลังได้ไม่ต้องลงใหม่)
5. **Choose Authentication Method:** เลือก **SSH Key** → ติ๊ก key ที่เพิ่มไว้ในข้อ 2.1 (อย่าใช้ Password)
6. ตัวเลือกเสริม: ติ๊ก **Enable Metrics Agent** (ฟรี ดูกราฟ CPU/RAM ได้), **Backups** จะเปิดก็ได้ (+20% ของราคาเครื่อง — สำรองทั้งเครื่องรายสัปดาห์)
7. **Finalize Details:**
   - Quantity: 1 Droplet
   - Hostname: ตั้งเป็น `csyfinproj-prod` (อ่านง่ายเวลามีหลายเครื่อง)
8. กด **Create Droplet** → รอ ~1 นาที → จด **IP address** ของเครื่อง (เช่น `152.42.xxx.xxx`)

### 2.3 ทดสอบ SSH เข้าเครื่อง

```bash
ssh root@<droplet-ip>
# ครั้งแรกจะถามยืนยัน fingerprint → พิมพ์ yes
# เข้าได้จะเห็น prompt root@csyfinproj-prod:~#
```

ถ้าเข้าไม่ได้ ดู [Troubleshooting](#troubleshooting)

---

## Phase 3: ผูก domain เข้ากับ droplet

เลือกทางใดทางหนึ่ง — **แนะนำทาง A (Cloudflare)** เพราะได้หน้าจัดการ DNS ที่ดี, มี analytics, และเปิดใช้ CDN/กันบอทเพิ่มได้ภายหลัง

### ทาง A: Cloudflare (แนะนำ)

1. เข้า [dash.cloudflare.com](https://dash.cloudflare.com) → **Add a domain** (ปุ่ม + Add a domain มุมขวาบน) → พิมพ์ `example.com` → เลือกแผน **Free** → **Continue**
   - (ถ้าซื้อ domain ผ่าน Cloudflare Registrar ข้ามข้อ 1–2 ได้ — domain อยู่ใน dashboard อยู่แล้ว)
2. Cloudflare จะให้ **nameserver 2 ตัว** (เช่น `xxx.ns.cloudflare.com`) → ไปที่เว็บที่ซื้อ domain → หาเมนู Nameservers → เปลี่ยนเป็น 2 ตัวนี้ → รอ activate (ไม่กี่นาทีถึงหลายชั่วโมง Cloudflare จะ email แจ้ง)
3. ในหน้า domain → เมนูซ้าย **DNS → Records** → **Add record**:
   - Type: `A` | Name: `app` | IPv4 address: `<droplet-ip>`
   - **Proxy status: กดให้เป็น "DNS only" (เมฆสีเทา)** ← สำคัญมาก! ต้องเป็นสีเทาก่อน เพื่อให้ Caddy บน droplet ขอ SSL cert จาก Let's Encrypt ได้ตรง ๆ (เมฆส้ม = ทราฟฟิกวิ่งผ่าน Cloudflare ซึ่งทำให้การออก cert แบบอัตโนมัติล้มเหลว — เปิดส้มทีหลังได้ ดู Phase 10)
   - **Save**

### ทาง B: DigitalOcean DNS

1. ที่เว็บที่ซื้อ domain → เปลี่ยน nameservers เป็น: `ns1.digitalocean.com`, `ns2.digitalocean.com`, `ns3.digitalocean.com`
2. ใน DO console → เมนูซ้าย **Networking** → แท็บ **Domains** → พิมพ์ `example.com` → **Add Domain**
3. ในหน้า domain สร้าง record: **A** | Hostname: `app` | Will direct to: เลือก droplet ของเรา | TTL: 3600 → **Create Record**

### ตรวจว่า DNS ติดแล้ว

```bash
# รันบนเครื่องคุณ — ต้องตอบ IP ของ droplet
dig +short app.example.com
```

ถ้ายังไม่ตอบ IP รอสักพัก (โดยทั่วไป 5–30 นาที) — **อย่าข้ามขั้นนี้** เพราะ Caddy จะออก cert ไม่ได้ถ้า DNS ยังไม่ชี้มา

---

## Phase 4: เตรียมเครื่อง server

### 4.1 รัน setup script

```bash
# บนเครื่องคุณ — ส่ง script ขึ้นไปแล้วรัน
scp deploy/setup-server.sh root@<droplet-ip>:/root/
ssh root@<droplet-ip> "bash /root/setup-server.sh"
```

script ใช้เวลา ~3–5 นาที ทำสิ่งเหล่านี้: อัปเดตแพ็กเกจ, ติดตั้ง Docker, เปิด swap 2 GB, ตั้ง firewall (เปิดเฉพาะ SSH/80/443), สร้างโฟลเดอร์ `/opt/csyfinproj`

### 4.2 ตรวจผล

```bash
ssh root@<droplet-ip>
docker --version        # ต้องเห็น Docker version 2x.x
free -h                 # บรรทัด Swap ต้องเห็น 2.0Gi
ufw status              # ต้องเห็น 22, 80/tcp, 443/tcp ALLOW
ls /opt/csyfinproj      # โฟลเดอร์ต้องมีอยู่ (ยังว่างเปล่า)
```

---

## Phase 5: สร้างไฟล์ .env บน server

### 5.1 เตรียมค่า secret ก่อน (รันบนเครื่องคุณหรือบน server ก็ได้)

```bash
openssl rand -base64 48   # ← JWT_SECRET (ต้องยาว ≥32 ตัวอักษร — API บังคับ)
openssl rand -hex 24      # ← MYSQL_ROOT_PASSWORD
openssl rand -hex 24      # ← MYSQL_PASSWORD
```

> ⚠️ **รหัส MySQL สองตัวต้องใช้ `-hex` เท่านั้น** (ได้เฉพาะ 0-9a-f) —
> ห้ามใช้ `-base64` เพราะอาจมีอักขระ `/` `+` `=` ซึ่งจะไปพัง `DATABASE_URL`
> (`mysql://user:รหัส@db:3306/...`) ทำให้ API สตาร์ทไม่ขึ้นด้วย error
> `P1013 invalid port number` — ส่วน JWT_SECRET ใช้ base64 ได้เพราะไม่ได้อยู่ใน URL

จดสามค่านี้เก็บไว้ในที่ปลอดภัย (password manager)

### 5.2 สร้างไฟล์

```bash
ssh root@<droplet-ip>
cd /opt/csyfinproj
nano .env
```

วางเนื้อหาจาก [deploy/.env.example](../deploy/.env.example) แล้วแก้ตามนี้:

```bash
GHCR_OWNER=armong2gther          # ชื่อ GitHub username ตัวพิมพ์เล็กทั้งหมด
IMAGE_TAG=latest                  # CI จะเขียนทับเองทุก deploy

SITE_ADDRESS=app.example.com      # domain จริง (ไม่ต้องมี https://)
CORS_ORIGIN=https://app.example.com
PUBLIC_API_URL=https://app.example.com

MYSQL_ROOT_PASSWORD=<ค่าที่ gen ไว้>
MYSQL_DATABASE=csyfinproj
MYSQL_USER=csyfin
MYSQL_PASSWORD=<ค่าที่ gen ไว้>

JWT_SECRET=<ค่าที่ gen ไว้>

LINE_CHANNEL_ACCESS_TOKEN=<จาก LINE Developers Console>
LINE_CHANNEL_SECRET=<จาก LINE Developers Console>
LINE_CHANNEL_ID=<จาก LINE Developers Console>

SMS_API_KEY=                      # เว้นว่างได้ถ้ายังไม่ใช้
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

บันทึกด้วย `Ctrl+O` Enter แล้วออก `Ctrl+X` จากนั้นล็อคสิทธิ์ไฟล์:

```bash
chmod 600 /opt/csyfinproj/.env
```

---

## Phase 6: ตั้งค่า GitHub

### 6.1 สร้าง SSH key สำหรับให้ CI เข้า server (คนละตัวกับ key ส่วนตัว)

```bash
# บนเครื่องคุณ
ssh-keygen -t ed25519 -f /tmp/deploy_key -C csyfinproj-deploy -N ""
# เอา public key ไปใส่ server:
ssh root@<droplet-ip> "cat >> ~/.ssh/authorized_keys" < /tmp/deploy_key.pub
# ทดสอบว่า key ใช้ได้:
ssh -i /tmp/deploy_key root@<droplet-ip> "echo DEPLOY_KEY_OK"
```

### 6.2 สร้าง Personal Access Token สำหรับให้ droplet ดึง image จาก GHCR

1. เข้า GitHub → คลิกรูปโปรไฟล์มุมขวาบน → **Settings**
2. เมนูซ้ายล่างสุด **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. **Generate new token → Generate new token (classic)**
4. Note: `csyfinproj-ghcr-pull` | Expiration: **No expiration** (หรือ 1 ปีแล้วค่อยต่อ) | Scopes: ติ๊กเฉพาะ **`read:packages`**
5. **Generate token** → **copy ค่า token ทันที** (จะไม่แสดงอีก)

### 6.3 ใส่ Secrets และ Variables ใน repo

เข้า repo บน GitHub → **Settings** (แท็บบนของ repo) → เมนูซ้าย **Secrets and variables → Actions**

แท็บ **Secrets** → กด **New repository secret** ทีละตัว:

| Name | Value |
|---|---|
| `DEPLOY_HOST` | IP ของ droplet เช่น `152.42.xxx.xxx` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | เนื้อหาไฟล์ private key ทั้งไฟล์: `cat /tmp/deploy_key` (รวมบรรทัด BEGIN/END) |
| `GHCR_PAT` | token จากข้อ 6.2 |

แท็บ **Variables** → กด **New repository variable**:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://app.example.com/api/v1` |
| `NEXT_PUBLIC_LIFF_ID` | LIFF ID จาก LINE Developers Console |

> ⚠️ สองตัวนี้ถูก**ฝังลงโค้ดเว็บตอน build** — ถ้าแก้ทีหลังต้องกด Run workflow ใหม่ให้ build ใหม่

เสร็จแล้วลบ key ชั่วคราวบนเครื่อง: `rm /tmp/deploy_key /tmp/deploy_key.pub`

---

## Phase 7: Deploy ครั้งแรก

### 7.1 สั่ง deploy

```bash
# บนเครื่องคุณ ใน repo
git push origin main
```

หรือถ้า push ไปแล้ว: เข้า repo → แท็บ **Actions** → เลือก workflow **Build & Deploy** ซ้ายมือ → ปุ่ม **Run workflow** → **Run workflow**

### 7.2 ตามดูผล

แท็บ **Actions** → คลิก run ล่าสุด จะเห็น 3 jobs:

1. `Build api image` + `Build web image` (รันขนาน ~5–10 นาทีครั้งแรก ครั้งถัดไปเร็วขึ้นเพราะ cache)
2. `Deploy to droplet` — copy ไฟล์, pull image, sync DB schema (`prisma db push`), start ทุก service

ทุก job ต้องเขียว ✅ — ถ้าแดง คลิกเข้าไปดู log ของ step ที่ fail แล้วเทียบกับ [Troubleshooting](#troubleshooting)

### 7.3 ตรวจระบบบน server

```bash
ssh root@<droplet-ip>
cd /opt/csyfinproj
docker compose ps
# ต้องเห็น 4 ตัว: db, api, web, caddy — STATUS เป็น Up (healthy)

curl -s https://app.example.com/api/health
# ต้องตอบ {"status":"ok","timestamp":"..."}
```

> Caddy ขอ SSL cert อัตโนมัติตอน start ครั้งแรก ใช้เวลา ~10–30 วินาที ถ้าเปิดเว็บแล้วยังไม่ติด รอครู่เดียวแล้ว refresh — ดู log ได้ด้วย `docker compose logs caddy`

### 7.4 เปิดเว็บ

เข้า `https://app.example.com` จากเบราว์เซอร์ — ต้องเห็นหน้า login (ยัง login ไม่ได้เพราะยังไม่มี user — ทำใน Phase 8)

---

## Phase 8: Seed ข้อมูลเริ่มต้น

seed script ต้องใช้ devDependencies ที่ไม่อยู่ใน production image จึงรันจากเครื่องคุณผ่าน SSH tunnel (พอร์ต MySQL ของ server เปิดเฉพาะ localhost — ปลอดภัย ไม่โดนสแกนจากอินเทอร์เน็ต):

```bash
# terminal หน้าต่างที่ 1 — เปิด tunnel ค้างไว้ (พอร์ตปลายทางบนเครื่องคุณใช้ 3307 กันชนกับ MySQL local)
ssh -N -L 3307:127.0.0.1:3306 root@<droplet-ip>

# terminal หน้าต่างที่ 2 — ใน repo
DATABASE_URL="mysql://csyfin:<MYSQL_PASSWORD>@127.0.0.1:3307/csyfinproj" \
  pnpm --filter @csyfinproj/api seed
```

เสร็จแล้วปิด tunnel (Ctrl+C หน้าต่างที่ 1) จากนั้นทดสอบ login ที่ `https://app.example.com` ด้วยบัญชี admin จาก seed แล้ว**เปลี่ยนรหัสผ่านทันที** (บัญชี seed เป็นค่า default ที่รู้กันในทีม dev)

---

## Phase 9: ตั้งค่า LINE

เข้า [developers.line.biz/console](https://developers.line.biz/console) → เลือก provider → channel ของร้าน

### 9.1 Webhook (Messaging API channel)

1. แท็บ **Messaging API** → หัวข้อ **Webhook settings**
2. **Webhook URL:** `https://app.example.com/api/v1/webhooks/line` → **Update** → กด **Verify** ต้องขึ้น Success
3. เปิดสวิตช์ **Use webhook**

### 9.2 LIFF endpoint (LINE Login channel)

1. แท็บ **LIFF** → เลือก LIFF app ที่ใช้อยู่ → **Edit**
2. **Endpoint URL:** เปลี่ยนเป็น `https://app.example.com/<path หน้า liff ของเรา>` → Save

### 9.3 ตรวจในระบบ

login เป็น admin → หน้า **ตั้งค่าระบบ** → ส่วนการเชื่อมต่อ LINE ต้องแสดงสถานะ configured และ webhook URL ตรงกับที่ตั้งไว้ (ค่านี้อ่านจาก `PUBLIC_API_URL`) → ทดสอบจริง: สแกน QR ผูกบัญชีลูกค้า → ส่งข้อความ/สลิปเข้า OA แล้วดูว่าระบบรับ

---

## Phase 10: หลังระบบขึ้นแล้ว

### Backup ฐานข้อมูลอัตโนมัติรายวัน

```bash
ssh root@<droplet-ip>
mkdir -p /opt/csyfinproj/backups
crontab -e   # เลือก nano ถ้าถาม แล้วเพิ่มบรรทัดนี้ (ตี 3 ทุกวัน เก็บย้อนหลัง 14 วัน):
```

```cron
0 3 * * * cd /opt/csyfinproj && docker compose exec -T db sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction csyfinproj' | gzip > backups/db-$(date +\%F).sql.gz && find backups -name 'db-*.sql.gz' -mtime +14 -delete
```

แนะนำเพิ่ม: ตั้งให้ copy ไฟล์ backup ออกนอกเครื่องด้วย (เช่น DO Spaces หรือ rclone ไป Google Drive) — เครื่องพังจะได้ไม่หมดตัว

### เปิด Cloudflare proxy (เมฆส้ม) — ทำหรือไม่ก็ได้

หลังระบบนิ่งแล้ว ถ้าอยากได้ CDN + ซ่อน IP จริง: Cloudflare → DNS → Records → คลิกเมฆเทาของ `app` ให้เป็น**ส้ม** แล้วไปที่ **SSL/TLS → Overview → ตั้งเป็น Full (strict)** — Caddy มี cert จริงอยู่แล้วจึงใช้โหมดนี้ได้เลย (ห้ามใช้โหมด Flexible เด็ดขาด จะเกิด redirect loop)

### การอัปเดตแอปหลังจากนี้

แก้โค้ด → push ขึ้น `main` → CI deploy ให้อัตโนมัติ จบ — ดูสถานะที่แท็บ Actions

### คำสั่งที่ใช้บ่อย + rollback

ดูหัวข้อ "คำสั่งดูแลระบบ" ใน [deployment.md](deployment.md) (logs, restart, rollback ด้วย `IMAGE_TAG`, backup ไฟล์อัปโหลด)

---

## Phase 11 (ทางเลือก): แยก instance dev กับ live

> ทำเมื่อต้องการเครื่องทดสอบ (dev) แยกจากเครื่องที่ร้านใช้จริง (live) —
> push ขึ้น branch `develop` = ขึ้น dev, merge เข้า `main` = ขึ้น live
> workflow ใน `.github/workflows/deploy.yml` รองรับอยู่แล้ว เหลือแค่เตรียมของตามนี้

### แนวคิด

| | **dev** | **live (production)** |
|---|---|---|
| Branch | `develop` | `main` |
| GitHub Environment | `dev` | `production` |
| Droplet | เครื่องใหม่ ($6/เดือน 1GB พอ) | เครื่องเดิม |
| Domain | `dev.example.com` | `app.example.com` |
| Database | ของตัวเอง (คนละเครื่อง) | ของตัวเอง |
| ข้อมูล | **seed เท่านั้น — ห้ามก็อป DB จริงมาใส่** (มี PII ลูกค้า ผิดหลัก PDPA) | ข้อมูลจริง |
| LINE | channel/OA **แยกอีกชุด** หรือเว้นว่าง | channel จริง |
| Image tag | `dev` + commit sha | `latest` + commit sha |

> ⚠️ **เหตุที่ LINE ต้องแยก channel:** Messaging API 1 channel ตั้ง Webhook URL
> ได้ **URL เดียว** — ถ้าให้ dev กับ live ใช้ channel เดียวกัน ข้อความลูกค้าจริง
> จะวิ่งเข้าเครื่องใดเครื่องหนึ่งเท่านั้น สร้าง channel ทดสอบใหม่ใน LINE
> Developers Console (ฟรี) สำหรับ dev หรือเว้นค่า LINE ว่างไว้ก็ใช้งานส่วนอื่นได้

### 11.1 สร้าง droplet dev

ทำซ้ำ Phase 2 อีกรอบ: แผน **$6/mo (1GB)** พอ (setup script เปิด swap ให้),
Hostname ตั้ง `csyfinproj-dev` แล้วจด IP ใหม่

### 11.2 DNS

เพิ่ม A record ใหม่ (Phase 3 เดิม): Name `dev` → IP ของ droplet dev (DNS only/เมฆเทา)

```bash
dig +short dev.example.com   # ต้องตอบ IP เครื่อง dev
```

### 11.3 เตรียมเครื่อง + .env

ทำซ้ำ Phase 4 และ Phase 5 บนเครื่อง dev โดยค่าใน `.env` ที่**ต้องต่างจาก live**:

```bash
SITE_ADDRESS=dev.example.com
CORS_ORIGIN=https://dev.example.com
PUBLIC_API_URL=https://dev.example.com

# gen ใหม่ทั้งสามค่า — ห้ามใช้ซ้ำกับ live
MYSQL_ROOT_PASSWORD=<gen ใหม่>
MYSQL_PASSWORD=<gen ใหม่>
JWT_SECRET=<gen ใหม่>

# ใช้ channel ทดสอบ หรือเว้นว่าง
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ID=
```

### 11.4 GitHub Environments

Workflow เลือกชุด secrets/variables จาก **Environment** ตาม branch —
ต้องย้ายของเดิม (ระดับ repo) เข้า Environment และสร้างชุด dev เพิ่ม:

1. Repo → **Settings → Environments** → **New environment** สร้าง 2 อัน: `production` และ `dev`
2. ใน **`production`**: เพิ่ม Environment secrets `DEPLOY_HOST` (IP live),
   `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `GHCR_PAT` และ Environment variables
   `NEXT_PUBLIC_API_URL=https://app.example.com/api/v1`, `NEXT_PUBLIC_LIFF_ID=<LIFF จริง>`
   (ค่าตรงกับที่เคยตั้งระดับ repo ใน Phase 6 — ย้ายมาไว้ที่นี่)
3. ใน **`dev`**: เพิ่มชุดเดียวกันแต่เป็นค่า dev — `DEPLOY_HOST` = IP เครื่อง dev,
   SSH key จะใช้ตัวเดิมหรือ gen ใหม่ก็ได้ (ถ้าใช้ตัวเดิม เอา public key ไปใส่
   `~/.ssh/authorized_keys` บนเครื่อง dev ด้วย), `GHCR_PAT` ตัวเดิมใช้ร่วมได้,
   `NEXT_PUBLIC_API_URL=https://dev.example.com/api/v1`, `NEXT_PUBLIC_LIFF_ID=<LIFF ทดสอบ>`
4. ลบ secrets/variables ระดับ repo ของเดิมออกเพื่อกันสับสน (Environment ชนะ repo อยู่แล้ว)
5. (แนะนำ) ใน `production` เปิด **Required reviewers** = ตัวเอง — ทุก deploy ขึ้น live
   จะหยุดรอให้กด Approve ในแท็บ Actions ก่อน กันมือลั่น

### 11.5 สร้าง branch develop และ deploy

```bash
git checkout -b develop
git push -u origin develop        # → Actions รัน Build & Deploy (dev) อัตโนมัติ
```

เสร็จแล้ว seed ข้อมูลบนเครื่อง dev (Phase 8 โดยชี้ tunnel ไปเครื่อง dev)
และตรวจ `https://dev.example.com/api/health`

### 11.6 Flow การทำงานหลังจากนี้

```
แก้โค้ด → push develop → ทดสอบบน dev.example.com
→ ผ่านแล้ว merge develop เข้า main (PR หรือ git merge) → ขึ้น live อัตโนมัติ
```

- schema เปลี่ยน: dev จะ `prisma db push` ให้เองตอน deploy — live ก็เช่นกัน
  แต่ถ้าเป็นการเปลี่ยนแบบทำลายข้อมูล deploy จะ fail ให้ไป backup แล้วรันเอง (ดู Troubleshooting)
- อยากบังคับ deploy ซ้ำโดยไม่แก้โค้ด: แท็บ Actions → Run workflow → เลือก branch

---

## Troubleshooting

| อาการ | สาเหตุ/วิธีแก้ |
|---|---|
| ssh เข้าไม่ได้ `Permission denied (publickey)` | ตอนสร้าง droplet ไม่ได้ติ๊ก SSH key — ใช้ DO console: หน้า droplet → **Access → Launch Droplet Console** แล้วเพิ่ม key เข้า `~/.ssh/authorized_keys` เอง |
| เปิดเว็บไม่ติด / cert error | DNS ยังไม่ชี้มาที่เครื่อง (`dig +short app.example.com` ต้องตอบ IP droplet), หรือ Cloudflare ยังเป็นเมฆส้มอยู่ตอน Caddy ขอ cert ครั้งแรก → เปลี่ยนเป็นเทา แล้ว `docker compose restart caddy` |
| Actions fail ที่ step **Build** | อ่าน log — ส่วนใหญ่คือ lint/type error ในโค้ด แก้แล้ว push ใหม่ |
| Actions fail ที่ **Copy compose files** / **Deploy** | เช็ค secrets `DEPLOY_HOST`/`DEPLOY_USER`/`DEPLOY_SSH_KEY` (private key ต้องครบทั้งไฟล์รวม BEGIN/END) และ firewall เปิดพอร์ต 22 |
| Deploy fail ตอน `docker login ghcr.io` | `GHCR_PAT` หมดอายุหรือ scope ไม่มี `read:packages` — สร้างใหม่แล้วอัปเดต secret |
| Deploy fail: `Error: P1013 ... invalid port number in database URL` | รหัส `MYSQL_PASSWORD` มีอักขระพิเศษ (`/` `+` `=` จาก base64) ไปพัง DATABASE_URL — แก้บน server: `nano /opt/csyfinproj/.env` เปลี่ยนรหัส MySQL ทั้งสองเป็นค่าจาก `openssl rand -hex 24` แล้ว **ถ้ายังเป็น deploy แรก (ไม่มีข้อมูล)** รัน `docker compose down -v` เพื่อล้าง volume ให้ MySQL init รหัสใหม่ จากนั้นกด Re-run job ใน Actions |
| Deploy fail: `Error: P1000: Authentication failed ... credentials for \`csyfin\`` | เปลี่ยนรหัสใน `.env` หลังจาก MySQL เคย start ไปแล้ว — ตัวแปร `MYSQL_*` มีผลเฉพาะตอน **สร้าง data volume ครั้งแรก** volume เดิมยังจำรหัสเก่า → ถ้ายังไม่มีข้อมูลจริง: `cd /opt/csyfinproj && docker compose down && docker volume rm csyfinproj_db_data` แล้ว Re-run job (ถ้ามีข้อมูลแล้ว ต้อง `ALTER USER` ด้วยรหัส root เดิมแทน — ห้ามลบ volume) |
| Deploy fail ตอน `prisma db push` ขึ้นเตือน data loss | ตั้งใจให้ fail — มีการเปลี่ยน schema แบบทำลายข้อมูล เข้าไป backup ก่อนแล้วรันเองบน server: `docker compose run --rm api npx prisma db push --skip-generate --accept-data-loss` |
| เว็บขึ้นแต่ login ไม่ติด (กดแล้วเด้งกลับ) | เปิดผ่าน HTTP หรือผ่าน IP ตรง ๆ — cookie production ต้องการ HTTPS + domain ให้เข้าผ่าน `https://app.example.com` เท่านั้น และ `CORS_ORIGIN` ต้องตรงกับ origin ที่เปิด |
| API ตอบ 502 จาก Caddy | `docker compose ps` ดูว่า api ตาย restart loop หรือไม่ → `docker compose logs api` — เจอบ่อยสุด: `DATABASE_URL`/`JWT_SECRET` ใน `.env` ผิดหรือสั้นเกิน (JWT ต้อง ≥32 ตัว) |
| เครื่องอืด / OOM | `free -h` + `docker stats` — ถ้า RAM เต็มประจำ อัปไซส์ droplet: ปิดเครื่องจากหน้า DO → **Resize** → เลือกแผนใหญ่ขึ้น → เปิดเครื่อง (data อยู่ครบ) |
