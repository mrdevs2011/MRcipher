import type { Metadata } from 'next';
import { SiteHeader, SiteSidebar, SiteBottomNav, SiteFooter } from '@/components/SiteChrome';

/**
 * /doc — Dasturchi qo'llanmasi.
 *
 * Ilgari bu sahifa `public/doc/index.html` da alohida, o'z-o'zidan yozilgan
 * statik HTML fayl edi. U ilovaning umumiy SiteHeader/SiteSidebar/SiteBottomNav
 * komponentlaridan foydalanmagani uchun boshqa barcha sahifalardan (Tarjimon,
 * API kalitlar, Fayl tekshirish) vizual jihatdan farqlanardi: boshqa logotip,
 * "Bosh sahifa" tugmasi, foydalanuvchi profili yo'q sidebar va h.k.
 *
 * Endi bu sahifa boshqalari kabi oddiy Next.js route bo'lib, xuddi shu
 * umumiy chrome komponentlarini ishlatadi — shu tufayli header va sidebar
 * butun ilova bo'ylab bir xil ko'rinadi.
 *
 * Alohida "Endpointlar" tab (bottom-bar/sidebar'da) olib tashlandi — uning
 * tarkibi (tezkor endpoint kartalar + to'liq jadval) endi shu sahifaning
 * "2. Endpointlar" bo'limiga ko'chirildi.
 */

export const metadata: Metadata = {
  title: "MRcipher — Dasturchi qo'llanmasi",
};

const TOC = [
  { href: '#boshlash', label: 'Boshlash' },
  { href: '#endpointlar', label: 'Endpointlar' },
  { href: '#kalit', label: 'API key' },
  { href: '#shifrlash', label: 'Shifrlash' },
  { href: '#ochish', label: 'Ochish' },
  { href: '#sdk', label: 'SDK' },
  { href: '#xavfsizlik', label: 'Xavfsizlik' },
  { href: '#test', label: 'Test app' },
];

export default function DocPage() {
  return (
    <div className="page">
      <SiteHeader />

      <div className="app-shell">
        <SiteSidebar active="guide" />

        <main className="app-main">
          <div className="container doc-page">
            <nav className="doc-toc">
              {TOC.map((item) => (
                <a key={item.href} href={item.href}>
                  {item.label}
                </a>
              ))}
            </nav>

            <h1>Dasturchi qo&rsquo;llanmasi</h1>
            <p className="doc-lead">
              MRcipher — bu Encryption-as-a-Service. O&lsquo;z ilovangizga shifrlash
              xizmatini ulash uchun sizga faqat HTTP so&rsquo;rovlar yuborish yetarli.
            </p>

            <div className="doc-tip">
              <strong>Tez fikr:</strong> MRcipher ma&rsquo;lumotlarni serverda shifrlaydi
              va sizga shunchaki <code>ciphertext + iv + tag</code> shaklidagi obyektni
              qaytaradi. Uni bazaga xavfsiz saqlang.
            </div>

            <h2 id="boshlash">1. Boshlash: 2 daqiqada</h2>
            <ol className="doc-steps">
              <li>
                <strong>MRcipher saytiga kiring:</strong>{' '}
                <a href="/">mrcipher.vercel.app</a> orqali Google hisobi bilan tizimga
                kiring.
              </li>
              <li>
                <strong>API key yaratish tugmasini bosing:</strong> Kalit nomini
                kiriting (masalan, &ldquo;My Backend&rdquo;) va yaratishni tasdiqlang.
              </li>
              <li>
                <strong>API key nusxasini oling:</strong> U faqat bir marta
                ko&rsquo;rsatiladi. Uni xavfsiz joyda saqlang — masalan, server
                environment variables.
              </li>
              <li>
                <strong>So&rsquo;rovlarni yuboring:</strong> Har bir so&rsquo;rovda
                sarlavha: <code>Authorization: Bearer &lt;apiKey&gt;</code>.
              </li>
            </ol>

            <h2 id="endpointlar">2. Endpointlar</h2>
            <p>So&rsquo;rovlarda quyidagi sarlavha bo&rsquo;lishi shart.</p>
            <pre>{`Authorization: Bearer <apiKey>`}</pre>

            <div className="endpoint-grid mt-1">
              <div className="feature-card">
                <div className="feature-title text-primary">POST /api/v1/encrypt</div>
                <p className="feature-desc">
                  JSON ma&rsquo;lumotni shifrlaydi va ciphertext qaytaradi.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-title text-primary">POST /api/v1/decrypt</div>
                <p className="feature-desc">
                  Ciphertext ni ochib, asl JSON ma&rsquo;lumotni qaytaradi.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-title text-primary">GET /api/v1/health</div>
                <p className="feature-desc">API key va Firestore holatini tekshiradi.</p>
              </div>
              <div className="feature-card">
                <div className="feature-title text-primary">GET /api/v1/usage</div>
                <p className="feature-desc">
                  Foydalanish statistikasi: shifrlash/ochish soni.
                </p>
              </div>
            </div>

            <h3>To&rsquo;liq jadval</h3>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>URL</th>
                  <th>Tavsif</th>
                  <th>Scope</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <span className="doc-method">POST</span>
                  </td>
                  <td>
                    <code>/api/v1/encrypt</code>
                  </td>
                  <td>Ma&rsquo;lumotni shifrlaydi</td>
                  <td>
                    <span className="doc-pill">encrypt</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span className="doc-method">POST</span>
                  </td>
                  <td>
                    <code>/api/v1/decrypt</code>
                  </td>
                  <td>Shifrlangan ma&rsquo;lumotni ochadi</td>
                  <td>
                    <span className="doc-pill">decrypt</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span className="doc-method">GET</span>
                  </td>
                  <td>
                    <code>/api/v1/health</code>
                  </td>
                  <td>API va Firestore holatini tekshiradi</td>
                  <td>
                    <span className="doc-pill">health</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span className="doc-method">GET</span>
                  </td>
                  <td>
                    <code>/api/v1/usage</code>
                  </td>
                  <td>Foydalanish statistikasi</td>
                  <td>
                    <span className="doc-pill">usage</span>
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="mt-1" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <a href="/verify" className="btn btn-secondary">
                Fayl hash&rsquo;ini solishtirish
              </a>
            </div>

            <h2 id="kalit">3. API key qoidalari</h2>
            <div className="card">
              <ul>
                <li>Har bir foydalanuvchi istalgancha ko&rsquo;p API key yaratadi.</li>
                <li>
                  API key serverda hech qachon oddiy matn ko&rsquo;rinishida
                  saqlanmaydi — faqat uning hash&rsquo;i.
                </li>
                <li>
                  Key&rsquo;ga ruxsat etilgan domenlar, IP manzillar va endpointlar
                  (scopes) qo&rsquo;shish mumkin.
                </li>
                <li>
                  Key bekor qilinganda (o&rsquo;chirilganda) eski so&rsquo;rovlar qabul
                  qilinmaydi.
                </li>
              </ul>
            </div>

            <h2 id="shifrlash">4. Ma&rsquo;lumotni shifrlash</h2>
            <p>
              Istalgan JSON-serializable ma&rsquo;lumotni shifrlashingiz mumkin: matn,
              son, obyekt, array.
            </p>

            <h3>So&rsquo;rov</h3>
            <p>
              <span className="doc-method">POST</span> <code>/api/v1/encrypt</code>
            </p>
            <pre>{`{
  "content": "Mening maxfiy xabarim"
}`}</pre>

            <h3>Javob</h3>
            <pre>{`{
  "success": true,
  "data": {
    "ciphertext": "...base64...",
    "iv": "...base64...",
    "tag": "...base64...",
    "version": "v1"
  },
  "meta": {
    "bytes_in": 22,
    "bytes_out": 64
  }
}`}</pre>

            <h3>Misollar</h3>
            <pre>{`# curl
curl -X POST https://mrcipher.vercel.app/api/v1/encrypt \\
  -H "Authorization: Bearer mr_xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"content":"Mening maxfiy xabarim"}'`}</pre>

            <pre>{`# Python
import requests

res = requests.post(
    "https://mrcipher.vercel.app/api/v1/encrypt",
    headers={"Authorization": "Bearer mr_xxxxxxxx"},
    json={"content": "Mening maxfiy xabarim"}
)
print(res.json()["data"])`}</pre>

            <h2 id="ochish">5. Shifrlangan ma&rsquo;lumotni ochish</h2>
            <p>
              Encrypt javobidan kelgan <code>data</code> obyektini yuboring.
            </p>

            <h3>So&rsquo;rov</h3>
            <p>
              <span className="doc-method">POST</span> <code>/api/v1/decrypt</code>
            </p>
            <pre>{`{
  "content": {
    "ciphertext": "...base64...",
    "iv": "...base64...",
    "tag": "...base64...",
    "version": "v1"
  }
}`}</pre>

            <h3>Javob</h3>
            <pre>{`{
  "success": true,
  "data": "Mening maxfiy xabarim",
  "meta": {
    "bytes_in": 64,
    "bytes_out": 22
  }
}`}</pre>

            <div className="doc-tip">
              <strong>Diqqat:</strong> ciphertext, iv va tag alohida-o&rsquo;zgartirilmagan
              bo&rsquo;lishi kerak. Aks holda <code>400 Bad Request</code> qaytariladi.
            </div>

            <h2 id="sdk">6. Drop-in SDK</h2>
            <p>
              Agar har bir maydonni qo&rsquo;lda shifrlash va ochish qiyin bo&rsquo;lsa,
              quyidagi SDK yordamida faqat maydon nomlarini belgilang.
            </p>

            <h3>Node.js + Firestore</h3>
            <pre>{`import { createServerClient } from 'mrcipher-sdk/server';

const mrcipher = createServerClient({
  apiKey: process.env.MRCIPHER_API_KEY,
  serverUrl: 'https://mrcipher.vercel.app',
  encryptFields: ['content', 'email', 'phone'],
});

// Avtomatik shifrlaydi
await db.collection('messages').add(
  mrcipher.encryptDoc({ content: 'Sekret' })
);

// Avtomatik ochadi
const doc = await db.collection('messages').doc(id).get();
const data = mrcipher.decryptDoc(doc.data());`}</pre>

            <h3>Tarjimalar</h3>
            <div className="card">
              <p>SDK&rsquo;lar quyidagi tillarda mavjud:</p>
              <ul>
                <li>
                  <strong>JavaScript / TypeScript</strong> — brauzer, Node.js, React.
                </li>
                <li>
                  <strong>Python</strong> — Django, FastAPI, Flask.
                </li>
                <li>
                  <strong>Go</strong> — net/http yoki istalgan framework.
                </li>
                <li>
                  <strong>PHP</strong> — Laravel, Symfony.
                </li>
                <li>
                  <strong>Java</strong> — Spring Boot.
                </li>
              </ul>
            </div>

            <h2 id="xavfsizlik">7. Xavfsizlik tez faktlar</h2>
            <div className="card">
              <ul>
                <li>
                  <strong>Shifrlash:</strong> AES-256-GCM, 256 bit kalit, 96 bit IV,
                  128 bit autentifikatsiya tag&rsquo;i.
                </li>
                <li>
                  <strong>Kalitlar:</strong> Har bir foydalanuvchi uchun master
                  key&rsquo;dan deterministic tarzda hosil qilinadi.
                </li>
                <li>
                  <strong>API key:</strong> SHA-256 hash sifatida saqlanadi, asl key
                  faqat yaratishda bir marta ko&rsquo;rsatiladi.
                </li>
                <li>
                  <strong>Firestore:</strong> Barcha client-side yozuvlar taqiqlangan.
                  Barcha ma&rsquo;lumotlar Admin SDK orqali o&rsquo;qiladi.
                </li>
                <li>
                  <strong>Rate limit:</strong> Har bir IP va har bir API key uchun
                  soatlik/daqiqalik chegaralar.
                </li>
                <li>
                  <strong>Ruxsatlar:</strong> Origin, IP/CIDR va endpoint
                  scope&rsquo;lari.
                </li>
              </ul>
            </div>

            <h2 id="test">8. Qo&rsquo;lda sinash</h2>
            <p>
              Saytdagi <a href="/test-client/index.html">Test app</a> ga tashrif
              buyuring. Unda ikkita telefon simulyatori orqali real vaqtda xabarlarni
              shifrlash va ochish jarayonini kuzatishingiz mumkin.
            </p>

            <h2 id="yordam">9. Yordam kerakmi?</h2>
            <p>
              Agar API keyingiz bekor bo&rsquo;lsa, yangi yaratish uchun{' '}
              <a href="/">MRcipher bosh sahifasiga</a> qayting. Server URL, origin
              cheklovlari yoki rate limit bo&rsquo;yicha muammolar bo&rsquo;lsa,
              iltimos, health endpointidan boshlang.
            </p>
          </div>

          <SiteFooter variant="app" />
        </main>

        <SiteBottomNav active="guide" />
      </div>
    </div>
  );
}
