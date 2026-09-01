# SavedPocket — "Remote UI + Local DB" Mimari Geçiş Planı

## Context

Mevcut mimari: tam self-hosted (kullanıcı tüm stack'i local çalıştırıyor).
Hedef mimari: UI + servisler benim sunucumda, kullanıcının verisi kendi local Postgres'inde.

**Keşif bulguları (kod analizi):**
- Tek global DB bağlantısı: `src/db/client.ts` (kolay taşınır)
- In-process job worker: Next.js süreci içinde `setInterval` (en kritik sorun)
- 29 API route dosyası: tümünde direkt `db` import'u, servis katmanı yok
- Auth tabloları (user, session) aynı Postgres'te
- Kategoriler global (tüm kullanıcılar aynı set)
- WebSocket/SSE yok, polling yapıyor
- Multi-tenancy: her sorguda `WHERE user_id = ?` filtresi — tutarlı

---

## Temel Mimari

```
savedpocket.com (REMOTE)              Kullanıcı Makinesi (LOCAL)
┌──────────────────────────┐         ┌──────────────────────────┐
│  Next.js UI              │         │  SavedPocket Agent       │
│  Auth Service            │◄───WS──►│  (Docker container)      │
│  LLM Worker              │         │          │               │
│  Embedding Service       │         │  PostgreSQL 16 + pgvector│
│  Agent Gateway (WS hub)  │         │  (kullanıcının verisi)   │
│  Platform DB (küçük)     │         └──────────────────────────┘
│    └─ users, sessions    │
│    └─ user_db_registry   │
└──────────────────────────┘
```

**NAT traversal çözümü:** Agent → sunucu yönünde outbound WebSocket
(443/TLS, her firewall geçer). Server SQL sorgularını bu kanal üzerinden gönderir.

---

## Bileşenler ve Effort

### Bileşen 0 — Platform DB (Yeni, küçük)
Sadece auth ve kullanıcı kayıt bilgisi için sunucuda küçük bir Postgres.

**Tablolar:**
```sql
users       (id, email, password_hash, api_key, created_at)
sessions    (id, user_id, token, expires_at)
user_agents (user_id, status, last_seen, agent_version, connected_at)
```

Auth tabloları buraya taşınır. Kullanıcı verisi buraya asla girmez.

**Effort: 3-5 gün**

---

### Bileşen 1 — Per-User DB Bağlantı Yöneticisi
Şu an tek global bağlantı var. Yeni: her kullanıcı için ayrı Drizzle instance.

```typescript
// Şu an (src/db/client.ts):
export const db = drizzle(globalThis.__sql)

// Yeni (src/db/router.ts):
const pool = new Map<string, DrizzleInstance>()

export async function getUserDb(userId: string): Promise<DrizzleInstance> {
  if (pool.has(userId)) return pool.get(userId)!
  const channel = gateway.getChannel(userId) // WebSocket kanalı
  const db = drizzle(new AgentDriver(channel)) // custom driver
  pool.set(userId, db)
  return db
}
```

Her API route'da:
```typescript
// Şu an:
const rows = await db.select().from(items).where(...)

// Yeni:
const db = await getUserDb(user.id)
const rows = await db.select().from(items).where(...)
```

**Effort: 2-3 hafta** (29 route dosyası × ortalama 30 dk)

---

### Bileşen 2 — Agent Gateway (WebSocket Hub)
Sunucuda: her kullanıcı için bir WebSocket bağlantısı yönetir.

**Protokol (JSON-RPC over WebSocket):**
```json
// Server → Agent (sorgu):
{ "id": "q-001", "method": "query", "sql": "SELECT ...", "params": [...] }

// Agent → Server (sonuç):
{ "id": "q-001", "rows": [...], "rowCount": 5 }

// Agent → Server (hata):
{ "id": "q-001", "error": "duplicate key value violates..." }
```

**Özellikler:**
- Token ile auth (bağlantı kurulurken)
- Heartbeat / reconnect (30s ping-pong)
- Request/response correlation (`id` field)
- Per-user channel isolation
- Connection state: online/offline/connecting

**Kütüphane:** `ws` (Node.js WebSocket server, Next.js custom server veya ayrı process)

**Effort: 2-3 hafta**

---

### Bileşen 3 — AgentDriver (Custom Drizzle Driver)
Drizzle'ın altına giren, SQL sorgularını WebSocket üzerinden proxy'leyen driver.

```typescript
class AgentDriver {
  constructor(private channel: AgentChannel) {}

  async query(sql: string, params: unknown[]) {
    const id = nanoid()
    return this.channel.request({ id, method: 'query', sql, params })
    // await ile cevap gelene kadar bekler (Promise + Map<id, resolve>)
  }
}
```

Transaction desteği (BEGIN/COMMIT/ROLLBACK) — tek query olarak sarmalanabilir.

**Effort: 1-2 hafta**

---

### Bileşen 4 — Local Agent (Kullanıcının Docker Container'ı)
Kullanıcının makinesinde çalışan tek container.

**İçindekiler:**
- PostgreSQL 16 + pgvector
- Agent process (Node.js, ~200 satır)
- Migration runner (startup'ta)

**Agent process görevi:**
```
1. Sunucuya WS bağlan (TOKEN ile)
2. Migration mesajları bekle → local Postgres'e uygula
3. Query mesajları bekle → local Postgres'e çalıştır → sonuç dön
4. Heartbeat gönder (30s)
5. Bağlantı kesilirse → exponential backoff ile yeniden dene
```

**Dockerfile:**
```dockerfile
FROM pgvector/pgvector:pg16
RUN apt-get install -y nodejs npm
COPY agent/ /agent/
RUN cd /agent && npm install
CMD ["/agent/start.sh"]  # postgres'i başlat, sonra agent'ı
```

**Kullanıcının çalıştırdığı komut:**
```bash
docker run -d --name savedpocket \
  -v savedpocket_data:/var/lib/postgresql/data \
  -e TOKEN=dashboard'dan_kopyalanan_token \
  ghcr.io/sen/savedpocket-agent:latest
```

**Effort: 3-4 hafta** (container, agent process, reconnect logic, migration runner)

---

### Bileşen 5 — Worker Migrasyonu
**Şu an:** Next.js process içinde `setInterval` (in-process, sunucuda)
**Hedef:** Local agent container içinde ayrı process

**Yeni job akışı:**
```
Sunucu                          Local Agent
   │                                │
   │ item kaydedildi               │
   │ → platform DB'ye job ekle     │
   │   {type:'analyze', itemId}    │
   │                                │
   │◄── "yeni job var mı?" poll ───│  (5s interval)
   │                                │
   │── job detayı gönder ──────────►│
   │   {type:'analyze',            │
   │    itemId, url, title}        │
   │                                │
   │                      local Postgres'ten
   │                      item fetch et
   │                                │
   │◄── "analiz etmeye hazırım" ───│
   │                                │
   │ Claude API çağır (sunucu)      │
   │ sonuç → agent'a ilet           │
   │──── UPDATE item ──────────────►│
   │     (analysis results)         │
   │                      local Postgres'e yaz
```

**Not:** Claude API çağrısı sunucuda kalır (API key güvenliği).
Embedding compute da sunucuda kalır.

**Effort: 2-3 hafta**

---

### Bileşen 6 — Onboarding UI
Kullanıcı kaydolduktan sonra göreceği "Agent bağla" ekranı.

**Adımlar:**
1. Token göster + Docker komutu göster (kopyala butonu)
2. "Agent bağlantısı bekleniyor..." (WebSocket ile polling)
3. Agent bağlandı → Migration'lar çalıştı → "Hazır!" animasyonu
4. Dashboard'a yönlendir

**Agent status indicator** (header'da küçük nokta):
- Yeşil: Online
- Sarı: Bağlanıyor / Yavaş
- Kırmızı: Offline (veri güvende, yeni kayıt yapılamaz)

**Effort: 1-2 hafta**

---

### Bileşen 7 — Auth Refactor
Better-auth şu an kullanıcının local Postgres'ini kullanıyor. Remote UI için platform DB'ye taşınmalı.

**Değişiklik:**
- `auth` instance: platform DB'ye bağlı (yeni `src/lib/auth.ts`)
- API key auth: mevcut `resolveUser()` — zaten çalışıyor
- Cookie-based session: platform DB'deki sessions tablosuna bakacak

**Auth tabloları (platform DB'ye taşınır):**
`user`, `session`, `account`, `verification`

**Kullanıcı verisi tabloları (local'de kalır):**
`items`, `collections`, `categories`, `collection_items`, `jobs`, `connections`

**Effort: 1-2 hafta**

---

### Bileşen 8 — Kategori Yönetimi
Kategoriler şu an global (tüm kullanıcılar aynı). Seçenekler:

**Seçenek A (kolay):** Kategoriler platform DB'de global kalır, local'e kopyalanmaz.
Artık: category_id foreign key local'de broken. Çözüm: category name string olarak items'a yazılır.

**Seçenek B (temiz):** Her agent bağlandığında default kategoriler local'e seed edilir. Migration gibi davranır.

**Seçenek B önerilir. Effort: 3-5 gün**

---

## Faz Planı

### Faz 1 — Temel Altyapı (8-10 hafta)
| Bileşen | Süre |
|---|---|
| Platform DB kurulumu | 3-5 gün |
| Auth refactor | 1-2 hafta |
| Agent Gateway (WS hub) | 2-3 hafta |
| AgentDriver (Drizzle custom driver) | 1-2 hafta |
| Per-user DB router | 2-3 hafta |

**Milestone:** Bir kullanıcı local agent çalıştırıp sunucu üzerinden DB'sine yazabiliyor.

---

### Faz 2 — Local Agent (4-5 hafta)
| Bileşen | Süre |
|---|---|
| Local agent process (Node.js) | 2 hafta |
| Docker container packaging | 1 hafta |
| Migration delivery protocol | 1 hafta |
| Onboarding UI | 1-2 hafta |

**Milestone:** `docker run ... --token=xxx` → dashboard açılıyor, link kaydedilebiliyor.

---

### Faz 3 — Worker Migrasyonu (3-4 hafta)
| Bileşen | Süre |
|---|---|
| Job polling protokolü | 1 hafta |
| Worker local agent'e taşıma | 2 hafta |
| Embedding agent-side vs server-side karar | 1 hafta |

**Milestone:** AI analizi, embedding, image cache local agent'ta çalışıyor.

---

### Faz 4 — Hardening (3-4 hafta)
- Offline state UI (agent kapalıyken dashboard read-only modu)
- Agent auto-update mekanizması
- Reconnect + job retry senaryoları
- Güvenlik audit (WebSocket auth, SQL injection prevention on agent)
- Multi-user yük testi (50 eşzamanlı agent)

---

## Özet Effort

| Faz | Süre (solo dev) |
|---|---|
| Faz 1 — Altyapı | 8-10 hafta |
| Faz 2 — Local Agent | 4-5 hafta |
| Faz 3 — Worker | 3-4 hafta |
| Faz 4 — Hardening | 3-4 hafta |
| **TOPLAM** | **18-23 hafta (~5 ay)** |

2 kişilik ekip: **10-13 hafta (~3 ay)**

---

## Risk Matrisi

| Risk | Olasılık | Etki | Çözüm |
|---|---|---|---|
| AgentDriver transaction desteği | Yüksek | Kritik | Transactionları tek SQL bloğu olarak serialize et |
| 29 route refactor hatası | Orta | Yüksek | Tip sistemi + integration test suite önce yaz |
| Kullanıcı Docker bilmiyor | Yüksek | Orta | macOS installer (.dmg) Faz 5 olarak planla |
| Agent offline → kullanıcı mahsur | Orta | Yüksek | Platform DB'de son 50 item cache (read-only mod) |
| Yüksek eşzamanlı bağlantı | Düşük | Orta | WS hub'ı separate process (cluster mode) |
| Better-auth API değişikliği | Düşük | Orta | Auth katmanını izole et, adapter pattern |

---

## Değişmeyecek Olanlar (Sıfır Refactor)

- Tüm Drizzle schema tanımları
- Chrome extension (zaten API key ile çalışıyor)
- MCP server (zaten API key ile çalışıyor — hedef mimarinin kanıtı)
- Frontend components (React, Tailwind)
- Collections, Export, WhatsApp import mantığı
- Hybrid search SQL (local Postgres'te çalışmaya devam eder)
- Better-auth session format

---

## Önerilen Başlangıç Noktası

**Faz 1'in ilk adımı:** AgentDriver + Agent Gateway prototipini ayrı bir `packages/agent-gateway/` dizininde mono-repo olarak kur, mevcut uygulamayı bozmadan. Prototype çalışınca route'ları teker teker taşı.
