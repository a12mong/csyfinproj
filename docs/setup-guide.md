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
- [Phase 11 (ทางเลือก): เพิ่ม instance dev](#phase-11-ทางเลือก-เพิ่ม-instance-dev) — บนเครื่องเดียวกับ live (ทาง A) หรือแยก droplet (ทาง B)
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

### ทำไมต้องมีขั้นนี้

ระบบที่เพิ่ง deploy เสร็จคือ**ฐานข้อมูลว่างเปล่า** — ยังไม่มีบัญชีผู้ใช้แม้แต่คนเดียว
จึง login ไม่ได้ ขั้นนี้คือการ "หยอดข้อมูลตั้งต้น" (seed) เข้าไป ได้แก่ บัญชี admin,
role และสิทธิ์เริ่มต้น, รายชื่อสถาบันการเงิน

### ทำไมต้องรันจากเครื่องเรา ไม่รันบน server

- ตัวสคริปต์ seed ต้องใช้เครื่องมือฝั่ง development (`tsx`) ซึ่ง**ไม่ได้ติดตั้งไว้ใน
  production image** (ตัดออกให้ image เล็กและปลอดภัย)
- ส่วน MySQL บน server **ไม่ได้เปิดพอร์ตออกอินเทอร์เน็ต** (ปลอดภัย — ไม่มีใครสแกนเจอ)
  เครื่องเราจึงต่อตรง ๆ ไม่ได้

ทางออกคือ **SSH tunnel** — ท่อลับผ่าน SSH: โปรแกรมบนเครื่องเราต่อเข้า
`127.0.0.1:3307` (พอร์ตบนเครื่องเราเอง) แล้ว ssh จะลักลอบส่งต่อไปให้ MySQL
บน server ให้เหมือนนั่งอยู่ในเครื่องนั้น

```
เครื่องเรา ──> 127.0.0.1:3307 ══ SSH tunnel ══> server ──> MySQL :3306
```

### 8.1 เปิด tunnel (terminal หน้าต่างที่ 1)

```bash
ssh -N -L 3307:127.0.0.1:3306 root@<droplet-ip>
```

- `-L 3307:127.0.0.1:3306` = ผูกพอร์ต 3307 ของเครื่องเรา → พอร์ต 3306 ของ server
  (ใช้ 3307 ฝั่งเรา กันชนกับ MySQL ที่อาจรันอยู่ในเครื่อง)
- `-N` = เปิดท่ออย่างเดียว ไม่เปิด shell — **หน้าจอจะนิ่งเฉย ๆ ไม่ขึ้นอะไรเลย
  นั่นคืออาการปกติ** ปล่อยหน้าต่างนี้ค้างไว้ ห้ามปิด จนกว่าจะ seed เสร็จ

### 8.2 รัน seed (terminal หน้าต่างที่ 2 — เปิดใหม่ cd เข้า repo)

มีสองแบบ **เลือกให้ถูกกับเครื่องปลายทาง**:

**เครื่อง live (ข้อมูลจริง) → ใช้ `seed:prod` เท่านั้น** — สร้างเฉพาะ role +
admin + สถาบันการเงิน ไม่ลบอะไร ไม่มีข้อมูลปลอม รันซ้ำได้:

```bash
DATABASE_URL="mysql://csyfin:<MYSQL_PASSWORD>@127.0.0.1:3307/<MYSQL_DATABASE>" \
SEED_ADMIN_EMAIL="อีเมลจริงของเจ้าของระบบ" \
SEED_ADMIN_PASSWORD="รหัสผ่านที่ตั้งเอง ยาว ≥8 ตัว" \
  pnpm --filter @csyfinproj/api seed:prod
```

**เครื่อง dev (ทดสอบ) → ใช้ `seed` (ตัวเต็ม)** — ได้ข้อมูลตัวอย่างครบ
(ลูกค้าปลอม รถ รายการขาย สัญญา) ไว้ลองระบบ:

```bash
DATABASE_URL="mysql://csyfin:<MYSQL_PASSWORD>@127.0.0.1:3307/<MYSQL_DATABASE>" \
  pnpm --filter @csyfinproj/api seed
```

> 🔴 **ห้ามรัน `seed` ตัวเต็มกับเครื่อง live เด็ดขาด** — สคริปต์ตัวเต็ม**ลบข้อมูล
> ทุกตารางก่อน**แล้วเติมข้อมูลปลอมทับ ใช้ `seed:prod` เท่านั้นสำหรับเครื่องจริง

**วิธีแทนค่าใน URL:**

| ช่อง | เอามาจาก |
|---|---|
| `<MYSQL_PASSWORD>` | ค่าในไฟล์ `/opt/csyfinproj/.env` บน server (ตัวที่ gen แบบ hex) |
| `<MYSQL_DATABASE>` | ชื่อ database ใน `.env` ตัวเดียวกัน — ค่า default คือ `csyfinproj` แต่**ถ้าตั้งเป็นชื่ออื่น (เช่น `csyfinproj_liv`) ต้องใช้ชื่อนั้น** |
| `3307` | คงไว้ตามเดิม (พอร์ต tunnel ที่เปิดในข้อ 8.1) |

### 8.3 ปิดท้าย

seed เสร็จ (ขึ้น ✓ ครบ) → กลับไป terminal หน้าต่างที่ 1 กด `Ctrl+C` ปิด tunnel
→ เปิดเว็บ login ด้วยบัญชี admin ที่เพิ่ง seed → เข้า **ตั้งค่า** สร้างผู้ใช้/role
เพิ่มตามต้องการ (เครื่อง dev: บัญชี seed คือ `admin@csyfinproj.local` /
`Admin1234!` — เป็นค่า default ที่รู้กันในทีม **เปลี่ยนรหัสทันที**)

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

## Phase 11 (ทางเลือก): เพิ่ม instance dev

> ทำเมื่อต้องการระบบทดสอบ (dev) แยกจากระบบที่ร้านใช้จริง (live) —
> push ขึ้น branch `develop` = ขึ้น dev, merge เข้า `main` = ขึ้น live
> workflow ใน `.github/workflows/deploy.yml` รองรับอยู่แล้ว
>
> เลือกได้สองทาง:
> - **ทาง A — dev อยู่บนเครื่องเดียวกับ live** ← แนะนำ ไม่ต้องจ่ายเพิ่ม จัดการเครื่องเดียว
> - **ทาง B — dev แยก droplet ของตัวเอง** (+$6/เดือน แยกทรัพยากรขาดกัน dev พังไม่กระทบ live)

### แนวคิด

| | **dev** | **live (production)** |
|---|---|---|
| Branch | `develop` | `main` |
| GitHub Environment | `dev` | `production` |
| ที่อยู่ | `/opt/csyfinproj-dev` (ทาง A) หรือ droplet ใหม่ (ทาง B) | `/opt/csyfinproj` |
| Domain | `dev.example.com` | `app.example.com` |
| Database | MySQL ของตัวเอง (คนละ container/volume/รหัสผ่าน เสมอ) | ของตัวเอง |
| ข้อมูล | **seed เท่านั้น — ห้ามก็อป DB จริงมาใส่** (มี PII ลูกค้า ผิดหลัก PDPA) | ข้อมูลจริง |
| LINE | channel/OA **แยกอีกชุด** หรือเว้นว่าง | channel จริง |
| Image tag | `dev` + commit sha | `latest` + commit sha |

> ⚠️ **เหตุที่ LINE ต้องแยก channel:** Messaging API 1 channel ตั้ง Webhook URL
> ได้ **URL เดียว** — ถ้าให้ dev กับ live ใช้ channel เดียวกัน ข้อความลูกค้าจริง
> จะวิ่งเข้าเครื่องใดเครื่องหนึ่งเท่านั้น สร้าง channel ทดสอบใหม่ใน LINE
> Developers Console (ฟรี) สำหรับ dev หรือเว้นค่า LINE ว่างไว้ก็ใช้งานส่วนอื่นได้

### 11.1 GitHub Environments (ทำเหมือนกันทั้งทาง A และ B)

Workflow เลือกชุด secrets/variables จาก **Environment** ตาม branch —
ต้องย้ายของเดิม (ระดับ repo) เข้า Environment และสร้างชุด dev เพิ่ม:

1. Repo → **Settings → Environments** → **New environment** สร้าง 2 อัน: `production` และ `dev`
2. ใน **`production`**: เพิ่ม Environment secrets `DEPLOY_HOST` (IP live),
   `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `GHCR_PAT` และ Environment variables
   `NEXT_PUBLIC_API_URL=https://app.example.com/api/v1`, `NEXT_PUBLIC_LIFF_ID=<LIFF จริง>`
   (ค่าตรงกับที่เคยตั้งระดับ repo ใน Phase 6 — ย้ายมาไว้ที่นี่)
3. ใน **`dev`**: เพิ่มชุดเดียวกันแต่เป็นค่า dev —
   - **ทาง A:** `DEPLOY_HOST` = **IP เดิมของเครื่อง live**, SSH key ตัวเดิม, `GHCR_PAT` ตัวเดิม
   - **ทาง B:** `DEPLOY_HOST` = IP เครื่อง dev ใหม่ (SSH key ใช้ตัวเดิมได้ ถ้าเอา
     public key ไปใส่ `~/.ssh/authorized_keys` บนเครื่อง dev ด้วย)
   - variables: `NEXT_PUBLIC_API_URL=https://dev.example.com/api/v1`,
     `NEXT_PUBLIC_LIFF_ID=<LIFF ทดสอบ>`
4. ลบ secrets/variables ระดับ repo ของเดิมออกเพื่อกันสับสน (Environment ชนะ repo อยู่แล้ว)
5. (แนะนำ) ใน `production` เปิด **Required reviewers** = ตัวเอง — ทุก deploy ขึ้น live
   จะหยุดรอให้กด Approve ในแท็บ Actions ก่อน กันมือลั่น

> โฟลเดอร์ deploy บน server: workflow ใช้ `/opt/csyfinproj` สำหรับ `main` และ
> `/opt/csyfinproj-dev` สำหรับ `develop` อัตโนมัติ — override ได้ด้วย
> Environment **variable** ชื่อ `DEPLOY_DIR` ถ้าต้องการ

---

### ทาง A: dev บนเครื่องเดียวกับ live (แนะนำ)

หลักการ: สอง stack เป็น compose project แยกกันสนิท (คนละโฟลเดอร์ คนละ volume
คนละรหัส DB) แต่เครื่องหนึ่งเปิดพอร์ต 80/443 ได้ชุดเดียว จึงมี **Caddy ตัวเดียว**
(ของ live) รับทั้งสอง domain แล้วแยกทางให้ผ่าน docker network กลางชื่อ `edge`:

```
                          ┌────────────────── droplet เดียว ──────────────────┐
 app.example.com ──443──▶ │ Caddy ──▶ live-api / live-web ──▶ db live (:3306) │
 dev.example.com ──443──▶ │   └─────▶ dev-api  / dev-web  ──▶ db dev  (:3307) │
                          └───────────────────────────────────────────────────┘
```

instance ไหนเป็นตัวรัน Caddy กำหนดด้วย `COMPOSE_PROFILES=edge` ใน `.env`
ของ instance นั้น (live) ส่วน dev เว้นว่างไว้

#### A.1 DNS

เพิ่ม A record: Name `dev` → **IP เดิมของ droplet live** (DNS only/เมฆเทา เหมือน Phase 3)

```bash
dig +short dev.example.com   # ต้องตอบ IP เดียวกับ app.example.com
```

#### A.2 เตรียมบนเครื่อง (ครั้งเดียว)

ssh เข้าเครื่องแล้วทำ 3 อย่าง:

**(1) สร้าง network กลาง** ให้ Caddy คุยข้าม compose project:

```bash
docker network create edge
```

**(2) เพิ่มตัวแปรระบุ instance ใน `.env` ของ live** (`nano /opt/csyfinproj/.env`):

```bash
COMPOSE_PROJECT_NAME=csyfinproj
EDGE_ALIAS=live
COMPOSE_PROFILES=edge            # ← สำคัญมาก! instance นี้คือตัวที่รัน Caddy
DB_HOST_PORT=3306
DEV_SITE_ADDRESS=dev.example.com # ← บอก Caddy ให้รับ domain ของ dev ด้วย
```

> ⚠️ **ห้ามลืม `COMPOSE_PROFILES=edge` ฝั่ง live** — compose เวอร์ชันใหม่ย้าย Caddy
> ไปอยู่ใต้ profile `edge` ถ้าลืมตั้งค่านี้ deploy รอบถัดไปจะถอด Caddy ทิ้ง
> (`--remove-orphans`) → **เว็บ live ล่มทันที** (แก้โดยเพิ่มบรรทัดนี้แล้ว `docker compose up -d`)

**(3) สร้างโฟลเดอร์ + `.env` ของ dev** โดยเริ่มจาก copy ของ live แล้วแก้:

```bash
mkdir -p /opt/csyfinproj-dev
cp /opt/csyfinproj/.env /opt/csyfinproj-dev/.env
chmod 600 /opt/csyfinproj-dev/.env
nano /opt/csyfinproj-dev/.env
```

ค่าที่**ต้องแก้**ในไฟล์ฝั่ง dev:

```bash
COMPOSE_PROJECT_NAME=csyfinproj-dev
EDGE_ALIAS=dev
COMPOSE_PROFILES=                # ← เว้นว่าง: dev ไม่รัน Caddy ของตัวเอง
DB_HOST_PORT=3307                # ← กันชนพอร์ต MySQL ของ live
# ลบบรรทัด DEV_SITE_ADDRESS ทิ้ง (ใช้เฉพาะ instance ที่รัน Caddy)

SITE_ADDRESS=dev.example.com     # ไม่ถูกใช้จริง (ไม่มี Caddy) แต่ตั้งไว้ให้อ่านง่าย
CORS_ORIGIN=https://dev.example.com
PUBLIC_API_URL=https://dev.example.com

MYSQL_ROOT_PASSWORD=<gen ใหม่: openssl rand -hex 24>
MYSQL_PASSWORD=<gen ใหม่: openssl rand -hex 24>
JWT_SECRET=<gen ใหม่: openssl rand -base64 48>

# channel ทดสอบ หรือเว้นว่าง (ดู warning ต้นเรื่อง)
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ID=
```

#### A.3 Deploy ทั้งสองฝั่ง

```bash
git checkout develop             # (git checkout -b develop ถ้ายังไม่มี branch)
git push -u origin develop       # → Actions: Deploy (dev) → /opt/csyfinproj-dev
```

ตอนนี้ stack dev ขึ้นแล้ว แต่ `https://dev.example.com` ยังเข้าไม่ได้ เพราะ Caddy
ฝั่ง live ยังใช้ Caddyfile เวอร์ชันเก่าอยู่ — **merge เข้า `main` แล้ว push อีกหนึ่งรอบ**
ให้ live ได้ compose + Caddyfile ใหม่ (Caddy จะเริ่มรู้จัก dev.example.com และออก
cert ให้ในรอบนี้):

```bash
git checkout main && git merge develop && git push
```

รอ Actions เขียวทั้งคู่ แล้วตรวจ:

```bash
curl -s https://app.example.com/api/health   # live ต้อง ok เหมือนเดิม
curl -s https://dev.example.com/api/health   # dev ต้อง ok
ssh root@<droplet-ip> "docker ps --format '{{.Names}}'"
# ต้องเห็นทั้งชุด csyfinproj-* (มี caddy) และ csyfinproj-dev-* (ไม่มี caddy)
```

#### A.4 Seed ฝั่ง dev

เหมือน Phase 8 แต่ปลายทาง tunnel คือพอร์ต **3307**:

```bash
ssh -N -L 3307:127.0.0.1:3307 root@<droplet-ip>     # หน้าต่างที่ 1
DATABASE_URL="mysql://csyfin:<MYSQL_PASSWORD ของ dev>@127.0.0.1:3307/csyfinproj" \
  pnpm --filter @csyfinproj/api seed                # หน้าต่างที่ 2 — dev ใช้ seed เต็มได้
```

#### A.5 เรื่อง RAM

สอง instance = MySQL 2 ตัว + Node 4 ตัว + Caddy — เครื่อง 2GB + swap รันได้แต่ค่อนข้างตึง
คอยดู `free -h` / `docker stats` ถ้าอืดหรือ OOM ให้ Resize เป็น **4GB ($24/เดือน —
เท่ากับค่าสองเครื่อง 2GB แยกกันพอดี)**: หน้า droplet ใน DO → ปิดเครื่อง → **Resize**
(เลือกแบบ CPU/RAM only จะย่อกลับได้) → เปิดเครื่อง

---

### ทาง B: dev แยก droplet ของตัวเอง

1. **สร้างเครื่อง:** ทำซ้ำ Phase 2 — แผน $6/mo (1GB) พอ, Hostname `csyfinproj-dev`, จด IP ใหม่
2. **DNS:** A record `dev` → IP เครื่องใหม่ (เมฆเทา) — `dig +short dev.example.com` ต้องตอบ IP dev
3. **เตรียมเครื่อง:** ทำซ้ำ Phase 4 บนเครื่องใหม่ (setup script สร้าง edge network ให้แล้ว)
4. **`.env`:** ทำซ้ำ Phase 5 แต่วางไว้ที่ **`/opt/csyfinproj-dev/.env`**
   (workflow ใช้โฟลเดอร์นี้สำหรับ branch `develop` — หรือถ้าอยากใช้ `/opt/csyfinproj`
   ก็ตั้ง Environment variable `DEPLOY_DIR=/opt/csyfinproj` ใน environment `dev` แทน)
   ค่าที่ต่างจาก live: `SITE_ADDRESS=dev.example.com`, `CORS_ORIGIN`/`PUBLIC_API_URL=https://dev.example.com`,
   รหัส MySQL/JWT gen ใหม่ทุกตัว, LINE ใช้ channel ทดสอบหรือเว้นว่าง
   ส่วน identity ใช้ค่ามาตรฐานได้เลย (`COMPOSE_PROFILES=edge` — เครื่องนี้มี Caddy ของตัวเอง,
   `EDGE_ALIAS=live`, `DB_HOST_PORT=3306`, ไม่ต้องมี `DEV_SITE_ADDRESS`)
5. **Deploy:** `git push -u origin develop` → seed ตาม Phase 8 (tunnel ชี้ IP เครื่อง dev)
   → ตรวจ `https://dev.example.com/api/health`

---

### Flow การทำงานหลังจากนี้ (ทั้งสองทาง)

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
| Seed fail: `Server has closed the connection` ตั้งแต่คำสั่งแรก | MySQL บน server ยังไม่รัน (เช่น เพิ่ง `docker compose down` ไว้ หรือ deploy ยังไม่สำเร็จ) — tunnel เปิดได้แต่ปลายทางว่างเปล่า → ตรวจบน server: `docker compose ps` ต้องเห็น `db ... Up (healthy)` ก่อน แล้วค่อยรัน seed ใหม่ (อย่าลืม: เครื่อง live ใช้ `seed:prod` เท่านั้น) |
| Deploy fail: `Error: P1013 ... invalid port number in database URL` | รหัส `MYSQL_PASSWORD` มีอักขระพิเศษ (`/` `+` `=` จาก base64) ไปพัง DATABASE_URL — แก้บน server: `nano /opt/csyfinproj/.env` เปลี่ยนรหัส MySQL ทั้งสองเป็นค่าจาก `openssl rand -hex 24` แล้ว **ถ้ายังเป็น deploy แรก (ไม่มีข้อมูล)** รัน `docker compose down -v` เพื่อล้าง volume ให้ MySQL init รหัสใหม่ จากนั้นกด Re-run job ใน Actions |
| Deploy fail: `Error: P1000: Authentication failed ... credentials for \`csyfin\`` | เปลี่ยนรหัสใน `.env` หลังจาก MySQL เคย start ไปแล้ว — ตัวแปร `MYSQL_*` มีผลเฉพาะตอน **สร้าง data volume ครั้งแรก** volume เดิมยังจำรหัสเก่า → ถ้ายังไม่มีข้อมูลจริง: `cd /opt/csyfinproj && docker compose down && docker volume rm csyfinproj_db_data` แล้ว Re-run job (ถ้ามีข้อมูลแล้ว ต้อง `ALTER USER` ด้วยรหัส root เดิมแทน — ห้ามลบ volume) |
| Deploy fail ตอน `prisma db push` ขึ้นเตือน data loss | ตั้งใจให้ fail — มีการเปลี่ยน schema แบบทำลายข้อมูล เข้าไป backup ก่อนแล้วรันเองบน server: `docker compose run --rm api npx prisma db push --skip-generate --accept-data-loss` |
| เว็บขึ้นแต่ login ไม่ติด (กดแล้วเด้งกลับ) | เปิดผ่าน HTTP หรือผ่าน IP ตรง ๆ — cookie production ต้องการ HTTPS + domain ให้เข้าผ่าน `https://app.example.com` เท่านั้น และ `CORS_ORIGIN` ต้องตรงกับ origin ที่เปิด |
| API ตอบ 502 จาก Caddy | `docker compose ps` ดูว่า api ตาย restart loop หรือไม่ → `docker compose logs api` — เจอบ่อยสุด: `DATABASE_URL`/`JWT_SECRET` ใน `.env` ผิดหรือสั้นเกิน (JWT ต้อง ≥32 ตัว) |
| เครื่องอืด / OOM | `free -h` + `docker stats` — ถ้า RAM เต็มประจำ อัปไซส์ droplet: ปิดเครื่องจากหน้า DO → **Resize** → เลือกแผนใหญ่ขึ้น → เปิดเครื่อง (data อยู่ครบ) |
| Deploy fail: `network edge declared as external, but could not be found` | ยังไม่ได้สร้าง network กลางบนเครื่องนั้น → `docker network create edge` แล้ว Re-run job |
| **เว็บ live ล่มหลัง deploy — container caddy หายไปเลย** | ลืมใส่ `COMPOSE_PROFILES=edge` ใน `/opt/csyfinproj/.env` (Caddy อยู่ใต้ profile `edge` — ไม่ตั้ง = ถูกถอดออกตอน `--remove-orphans`) → เพิ่มบรรทัดแล้ว `cd /opt/csyfinproj && docker compose up -d` |
| `dev.example.com` เข้าไม่ได้/cert error แต่ live ปกติ (โหมดเครื่องเดียว) | Caddy ฝั่ง live ยังไม่รู้จัก dev — เช็คว่า (1) `DEV_SITE_ADDRESS=dev.example.com` อยู่ใน `.env` ของ **live** (2) merge เข้า `main` แล้วอย่างน้อยหนึ่งรอบหลังเพิ่ม dev เพื่อให้ Caddyfile ใหม่ถูก scp + reload (3) DNS `dev` ชี้ IP เครื่องนี้แบบเมฆเทา → แก้แล้ว `cd /opt/csyfinproj && docker compose restart caddy` |
| ทำ dev แล้ว MySQL local/เครื่องอื่นชนพอร์ต tunnel | dev ใช้พอร์ต `127.0.0.1:3307` บน droplet (ตั้งใน `DB_HOST_PORT`) — tunnel ให้ชี้ `-L 3307:127.0.0.1:3307` และ `DATABASE_URL` ใช้พอร์ต 3307 |
