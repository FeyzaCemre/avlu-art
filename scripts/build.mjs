// Avlu Arts statik site üreticisi — npm run pages
// Ana sayfa + hizmet sayfalarını tek veri kaynağından public/ içine üretir.
// Önce görseller için: npm run media
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { transform } from 'esbuild';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'public');
const SITE = 'https://www.avluarts.com';

const INFO = {
  phone: '+90 534 762 19 89',
  tel: '+905347621989',
  wa: '905347621989',
  mail: 'info@avluarts.com',
  ig: 'https://www.instagram.com/avluarts/',
  igHandle: '@avluarts',
  maps: 'https://maps.app.goo.gl/YnJN2JnLVLoKVAHW7',
  street: 'Önerler Mah. Ziya Gökalp Blv. C Blok No: 21/1D',
  city: '59850 Çorlu / Tekirdağ',
};
const waLink = (msg = 'Merhaba Avlu Arts, randevu almak istiyorum.') =>
  `https://wa.me/${INFO.wa}?text=${encodeURIComponent(msg)}`;

/* ---------- görseller (scripts/media.mjs çıktısı) ---------- */
// Veride görseller 'img/<klasör>/<ad>.jpg' olarak yazılır; burada WebP srcset'e çevrilir.
const MANIFEST = JSON.parse(readFileSync(join(ROOT, 'scripts', 'media-manifest.json'), 'utf8'));
const keyOf = (src) => src.replace(/^img\//, '').replace(/\.\w+$/, '');
const media = (src) => {
  const m = MANIFEST[keyOf(src)];
  if (!m) throw new Error(`Görsel bulunamadı: ${src} — önce "npm run media" çalıştırın.`);
  return m;
};
const variant = (src, w) => `img/${keyOf(src)}-${w}.webp`;
const largest = (src) => variant(src, Math.max(...media(src).widths));
const size = (src) => media(src);

/**
 * Duyarlı <img>: WebP srcset + gerçek boyutlar (CLS olmaz).
 * opts: sizes, alt, cls, style, lazy (varsayılan true), priority ('high' | 'low'), extra
 */
function pic(base, src, { sizes = '100vw', alt = '', cls = '', style = '', lazy = true, priority, extra = '' } = {}) {
  const m = media(src);
  const srcset = m.widths.map((w) => `${base}${variant(src, w)} ${w}w`).join(', ');
  const def = m.widths.includes(800) ? 800 : Math.max(...m.widths);
  return `<img src="${base}${variant(src, def)}" srcset="${srcset}" sizes="${sizes}" alt="${alt}" width="${m.w}" height="${m.h}"`
    + `${cls ? ` class="${cls}"` : ''}${style ? ` style="${style}"` : ''}`
    + `${lazy ? ' loading="lazy"' : ''} decoding="async"${priority ? ` fetchpriority="${priority}"` : ''}${extra}>`;
}

const list = (dir) =>
  Object.keys(MANIFEST).filter((k) => k.startsWith(dir + '/') && /^\d+$/.test(k.split('/')[1]))
    .sort((a, b) => parseInt(a.split('/')[1]) - parseInt(b.split('/')[1])).map((k) => `img/${k}.jpg`);
const range = (dir, a, b) => Array.from({ length: b - a + 1 }, (_, k) => `img/${dir}/${a + k}.jpg`);

/* ---------- CSS/JS: küçült + içerik hash'li dosya adı (uzun süreli önbellek) ---------- */
const FONT_CSS = [
  ['Instrument Serif', 'instrument-serif', 400, 'normal', ['latin', 'latin-ext']],
  ['Instrument Serif', 'instrument-serif', 400, 'italic', ['latin', 'latin-ext']],
  ['Inter Tight', 'inter-tight', 400, 'normal', ['latin', 'latin-ext']],
  ['Inter Tight', 'inter-tight', 500, 'normal', ['latin', 'latin-ext']],
  ['Inter Tight', 'inter-tight', 600, 'normal', ['latin', 'latin-ext']],
].flatMap(([fam, file, wt, st, subsets]) => subsets.map((sub) => `@font-face{font-family:"${fam}";font-style:${st};font-weight:${wt};font-display:swap;src:url(../fonts/${file}-${sub}-${wt}-${st}.woff2) format("woff2");unicode-range:${sub === 'latin'
  ? 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
  : 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'}}`)).join('');

async function asset(srcFile, ext, prefix = '') {
  const code = prefix + readFileSync(join(ROOT, 'src', srcFile), 'utf8');
  const { code: min } = await transform(code, { loader: ext, minify: true, target: ext === 'css' ? ['chrome100', 'safari15', 'firefox100'] : 'es2020' });
  const hash = createHash('sha1').update(min).digest('hex').slice(0, 10);
  const name = `${srcFile.replace(/\.\w+$/, '')}.${hash}.${ext}`;
  writeFileSync(join(OUT, 'assets', name), min);
  return `assets/${name}`;
}
rmSync(join(OUT, 'assets'), { recursive: true, force: true });
mkdirSync(join(OUT, 'assets'), { recursive: true });
const CSS = await asset('style.css', 'css', FONT_CSS);
const JS = await asset('app.js', 'js');

/* ---------- ikonlar ---------- */
const I = {
  arrow: '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  ne: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 17 17 7M8 7h9v9"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.4zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 0 1 12 2.2a9.8 9.8 0 0 1 0 19.6zM12 0a12 12 0 0 0-10.3 18.1L0 24l6.1-1.6A12 12 0 1 0 12 0z"/></svg>',
  ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  l: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M15 6l-6 6 6 6"/></svg>',
  r: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 6l6 6-6 6"/></svg>',
};

/* ---------- hizmetler ---------- */
const SERVICES = [
  {
    key: 'dovme', slug: 'corlu-dovme', name: 'Dövme', en: 'Tattoo',
    title: 'Çorlu Dövme Stüdyosu',
    desc: 'Çorlu’da kişiye özel dövme tasarımı: fine line, minimal, lettering, blackwork ve realistik dövme. Steril ortam, özenli işçilik — Avlu Arts.',
    headline: ['Hikâyeni', '<em>tene</em> işliyoruz.'],
    short: 'Fine line’dan blackwork’e; sana özel çizilen, ömür boyu taşıyacağın tasarımlar.',
    tags: ['Fine line', 'Minimal', 'Lettering', 'Blackwork'],
    card: 'img/dovme/7.jpg',
    hero: ['img/dovme/38.jpg', 'img/dovme/40.jpg', 'img/dovme/13.jpg'],
    intro: [
      'Bir dövme, cildinde taşıyacağın bir hikâyedir. Biz o hikâyeyi dinliyor, yalnızca sana ait bir tasarıma dönüştürüyoruz.',
      'Avlu Arts’ta her çalışma bir sohbetle başlar: fikrini, yerleşimi, boyutu ve stili birlikte konuşur; tasarımı vücuduna ve tarzına göre çizeriz. Küçük bir sembolden kapsamlı bir kompozisyona kadar hazır kalıplar yerine özgün işler üretiriz.',
      'Uygulama steril ekipmanla ve hijyen kurallarına titizlikle uyularak yapılır. Seans sonunda iyileşme süreci için bakım adımlarını tek tek anlatırız.',
    ],
    types: [
      ['Fine Line', 'İnce, zarif çizgilerle detaylı ve hafif görünen işler.'],
      ['Minimal & Sembol', 'Küçük, anlamlı ve zamansız dokunuşlar.'],
      ['Lettering', 'İsimler, tarihler, alıntılar; el yazısından kaligrafiye.'],
      ['Blackwork', 'Güçlü siyah alanlar ve grafik kompozisyonlar.'],
      ['Botanik', 'Çiçek, dal ve yaprak motifleriyle organik tasarımlar.'],
      ['Realistik', 'Gölge ve dokuyla derinlik kazanan detaylı çalışmalar.'],
    ],
    care: [
      'İlk saatlerde koruyucu örtüyü açma; ardından bölgeyi ılık su ve sabunla nazikçe yıka.',
      'Önerdiğimiz bakım kremini ince bir tabaka halinde uygula, fazlasından kaçın.',
      'Kabukları koparma, kaşıma; bölgeyi temiz ve nefes alır halde tut.',
      'İyileşene kadar havuz, deniz, sauna ve solaryumdan uzak dur.',
      'Güneşten koru; iyileştikten sonra yüksek faktörlü güneş kremi kullan.',
    ],
    faq: [
      ['Dövme acıtır mı?', 'Hissedilen acı bölgeye ve kişiye göre değişir. İnce çizgi işler genellikle daha rahat geçer; seans boyunca ihtiyaç duydukça ara vererek ilerliyoruz.'],
      ['Kendi tasarımımı getirebilir miyim?', 'Elbette. Referans görsel, çizim ya da sadece bir fikir getirebilirsin; tasarımı yerleşime ve cilde uygun olacak şekilde birlikte uyarlarız.'],
      ['Fiyat neye göre belirlenir?', 'Boyut, detay yoğunluğu, bölge ve seans süresi fiyatı belirler. Net bilgi için referans görselini ve düşündüğün bölgeyi WhatsApp’tan gönderebilirsin.'],
      ['İyileşme ne kadar sürer?', 'Yüzeysel iyileşme genellikle birkaç hafta sürer; bu süreçte bakım talimatlarına uymak renklerin ve çizgilerin netliği için çok önemlidir.'],
    ],
    gallery: list('dovme'),
  },
  {
    key: 'piercing', slug: 'corlu-piercing', name: 'Piercing', en: 'Piercing',
    title: 'Çorlu Piercing',
    desc: 'Çorlu’da hijyenik ve güvenli piercing: kulak, burun, dudak, kaş ve göbek piercing uygulamaları. Avlu Arts.',
    headline: ['Küçük bir ışıltı,', '<em>büyük</em> bir ifade.'],
    short: 'Kulaktan buruna, steril koşullarda ve doğru yerleşimle uygulanan piercingler.',
    tags: ['Kulak', 'Burun', 'Dudak', 'Göbek'],
    card: 'img/piercing/2.jpg',
    hero: ['img/piercing/2.jpg', 'img/piercing/1.jpg', 'img/piercing/3.jpg'],
    intro: [
      'Piercing, tarzını en ince detayda anlatmanın yolu. Doğru yerleşim ve doğru takı, farkı yaratır.',
      'Uygulamadan önce yüz ve kulak yapına en uygun noktayı birlikte belirliyor, takı seçeneklerini gösteriyoruz. Her adımda ne yapacağımızı anlatıyor, soru işareti bırakmıyoruz.',
      'Tüm uygulamalar steril ekipmanla ve hijyen standartlarına uygun şekilde yapılır; iyileşme sürecinde de yanındayız.',
    ],
    types: [
      ['Kulak', 'Lob, helix, tragus, conch ve kombin kulak tasarımları.'],
      ['Burun', 'Nostril ve septum uygulamaları.'],
      ['Dudak', 'Labret ve medusa gibi dudak çevresi piercingler.'],
      ['Göbek', 'Klasik göbek piercingi, zarif takı seçenekleriyle.'],
      ['Kaş', 'Karakterli ve cesur bir detay.'],
    ],
    care: [
      'Bölgeyi günde birkaç kez steril serum fizyolojik ile temizle.',
      'Takıyı çevirme, oynatma; kirli elle dokunma.',
      'İyileşme süresince takıyı değiştirme ya da çıkarma.',
      'Havuz, deniz ve saunadan iyileşene kadar uzak dur.',
      'Kızarıklık veya akıntı uzun sürerse bizimle iletişime geç.',
    ],
    faq: [
      ['Piercing acıtır mı?', 'Çoğu uygulama saniyeler süren kısa bir his bırakır. Bölgeye göre değişmekle birlikte işlem oldukça hızlıdır.'],
      ['İyileşme ne kadar sürer?', 'Bölgeye göre birkaç haftadan birkaç aya kadar değişir. Kıkırdak bölgeler (helix, tragus gibi) genellikle daha uzun sürer.'],
      ['Takımı kendim seçebilir miyim?', 'Evet, stüdyodaki seçenekler arasından yerleşime ve tarzına uygun takıyı birlikte seçiyoruz.'],
    ],
    gallery: list('piercing'),
  },
  {
    key: 'protez', slug: 'corlu-protez-tirnak', name: 'Protez Tırnak', en: 'Nail Extensions',
    title: 'Çorlu Protez Tırnak',
    desc: 'Çorlu’da jel, akrilik ve dipping protez tırnak uygulamaları. İstediğin uzunluk ve şekilde, doğal görünümlü tırnaklar — Avlu Arts.',
    headline: ['İstediğin form,', '<em>kusursuz</em> tırnaklar.'],
    short: 'Jel, akrilik ya da dipping; istediğin uzunluk ve şekilde dayanıklı tırnaklar.',
    tags: ['Jel', 'Akrilik', 'Dipping', 'Nail art'],
    card: 'img/nail/36.jpg',
    hero: ['img/nail/36.jpg', 'img/nail/33.jpg', 'img/nail/38.jpg'],
    intro: [
      'Kırılan, uzamayan ya da soyulan tırnaklara veda et. Protez tırnak; istediğin uzunluğu ve formu, doğal bir görünümle sunar.',
      'Jel, akrilik veya dipping (toz) yöntemlerinden tırnak yapına ve kullanım alışkanlıklarına en uygun olanı birlikte seçiyoruz. Badem, kare, balerin ya da stiletto — şekli sen belirle, detayı biz işleyelim.',
      'Tasarımı tamamlamak için kalıcı oje, french, ombre veya el yapımı nail art dokunuşları ekleyebiliriz.',
    ],
    types: [
      ['Jel Tırnak', 'Hafif, esnek ve doğal görünümlü uzatma.'],
      ['Akrilik', 'Dayanıklı yapısıyla uzun formlar için ideal.'],
      ['Dipping', 'Toz sistemle ince ve sağlam bir kaplama.'],
      ['Nail Art', 'French, ombre, taş ve el çizimi tasarımlar.'],
      ['Dolgu & Bakım', 'Uzayan kısmın dolgusu ve formun yenilenmesi.'],
    ],
    care: [
      'Tırnaklarını alet olarak kullanmaktan (açma, kazıma) kaçın.',
      'Temizlik yaparken eldiven kullan.',
      'Kütikül yağıyla tırnak etlerini düzenli nemlendir.',
      'Dolgu randevularını aksatma; çıkarma işlemini mutlaka stüdyoda yaptır.',
    ],
    faq: [
      ['Protez tırnak ne kadar dayanır?', 'Düzenli dolgu ile uzun süre kullanılabilir. Tırnak uzadıkça genellikle birkaç haftada bir dolgu önerilir.'],
      ['Hangi yöntemi seçmeliyim?', 'Tırnak yapına, istediğin uzunluğa ve günlük kullanımına göre değişir. Randevuda birlikte karar veriyoruz.'],
      ['Doğal tırnağıma zarar verir mi?', 'Doğru uygulanıp profesyonel şekilde çıkarıldığında doğal tırnağa zarar vermesi en aza iner.'],
    ],
    gallery: range('nail', 33, 40).concat(range('nail', 1, 12)),
  },
  {
    key: 'oje', slug: 'corlu-kalici-oje', name: 'Kalıcı Oje', en: 'Gel Polish',
    title: 'Çorlu Kalıcı Oje',
    desc: 'Çorlu’da kalıcı oje: 2–4 hafta ilk günkü parlaklık. French, ombre ve nail art seçenekleriyle — Avlu Arts.',
    headline: ['Haftalarca', 'ilk günkü <em>parlaklık.</em>'],
    short: '2–4 hafta çatlamayan, solmayan, ilk günkü gibi parlayan renkler.',
    tags: ['Tek renk', 'French', 'Ombre', 'Tasarım'],
    card: 'img/nail/9.jpg',
    hero: ['img/nail/9.jpg', 'img/nail/20.jpg', 'img/nail/27.jpg'],
    intro: [
      'Kalıcı oje; estetiği ve pratikliği bir araya getirir. Bir kez yaptır, haftalarca düşünme.',
      'Özel jel formülü UV/LED ışık altında kurutularak dayanıklı bir yüzey oluşturur. Böylece oje kolayca çıkmaz, çatlamaz ve 2–4 hafta boyunca ilk günkü görünümünü korur.',
      'Doğal tırnaklarına ya da protez tırnak üzerine uygulanabilir; geniş renk paletimizden seç ya da tasarımı birlikte oluşturalım.',
    ],
    types: [
      ['Tek Renk', 'Nudelardan canlı tonlara geniş renk seçenekleri.'],
      ['French', 'Klasik ya da renkli uçlarla modern french.'],
      ['Ombre', 'Yumuşak geçişli baby boomer ve renk geçişleri.'],
      ['Nail Art', 'Çizim, taş, folyo ve sezonun trend tasarımları.'],
    ],
    care: [
      'İlk saatlerde çok sıcak su ile uzun temastan kaçın.',
      'Temizlikte eldiven kullan; kimyasallar parlaklığı azaltabilir.',
      'Kütikül yağıyla tırnak çevresini nemli tut.',
      'Ojeyi kazıyarak çıkarma; çıkarma işlemini stüdyoda yaptır.',
    ],
    faq: [
      ['Kalıcı oje ne kadar dayanır?', 'Tırnak yapısına ve kullanıma göre genellikle 2–4 hafta ilk günkü görünümünü korur.'],
      ['Doğal tırnağa zarar verir mi?', 'Doğru uygulama ve profesyonel çıkarma ile doğal tırnağın sağlığı korunur. Kazıyarak çıkarmak tırnağı yıpratır.'],
      ['Protez tırnak üzerine uygulanabilir mi?', 'Evet, kalıcı oje hem doğal tırnağa hem de protez tırnak üzerine uygulanabilir.'],
    ],
    gallery: range('nail', 1, 32),
  },
  {
    key: 'manikur', slug: 'corlu-manikur-pedikur', name: 'Manikür & Pedikür', en: 'Mani · Pedi',
    title: 'Çorlu Manikür & Pedikür',
    desc: 'Çorlu’da manikür ve pedikür: tırnak, kütikül ve el–ayak bakımı, kalıcı oje ile tamamlanan bakım — Avlu Arts.',
    headline: ['Bakımlı eller,', '<em>hafif</em> adımlar.'],
    short: 'Tırnak, kütikül ve cilt bakımıyla eller ve ayaklar için özenli bakım.',
    tags: ['Manikür', 'Pedikür', 'Kütikül', 'Kalıcı oje'],
    card: 'img/nail/12.jpg',
    hero: ['img/nail/12.jpg', 'img/nail/4.jpg', 'img/nail/24.jpg'],
    intro: [
      'Güzel tırnaklar bakımla başlar. Manikür ve pedikür, hem görünüm hem de tırnak sağlığı için en temel adım.',
      'Tırnak şekillendirme, kütikül bakımı ve cilt bakımıyla ellerini ve ayaklarını yeniliyoruz. İstersen bakımı kalıcı oje ya da nail art ile tamamlayabilirsin.',
      'Kullandığımız tüm aletler her uygulama öncesinde hijyen kurallarına uygun şekilde hazırlanır.',
    ],
    types: [
      ['Manikür', 'Tırnak şekillendirme, kütikül ve el bakımı.'],
      ['Pedikür', 'Tırnak, kütikül ve ayak bakımı.'],
      ['Kalıcı Ojeli Bakım', 'Bakımın ardından haftalarca kalıcı renk.'],
      ['Kütikül Bakımı', 'Tırnak çevresi için temiz ve düzgün bir görünüm.'],
    ],
    care: [
      'El ve ayak kremini düzenli kullan.',
      'Kütikül yağıyla tırnak çevresini nemlendir.',
      'Tırnak kenarlarını koparma, gerekirse törpüyle düzelt.',
      'Bakımını birkaç haftada bir yenile.',
    ],
    faq: [
      ['Manikür ve pedikürü aynı randevuda yaptırabilir miyim?', 'Evet, randevu alırken ikisini birlikte belirtmen yeterli; süreyi buna göre planlıyoruz.'],
      ['Bakıma kalıcı oje eklenebilir mi?', 'Elbette. Bakımın ardından kalıcı oje, french ya da nail art ile tamamlayabiliriz.'],
    ],
    gallery: range('nail', 1, 24),
  },
  {
    key: 'kirpik', slug: 'corlu-kirpik', name: 'Kirpik', en: 'Lashes',
    title: 'Çorlu Kirpik Uygulamaları',
    desc: 'Çorlu’da kirpik lifting, ipek kirpik ve volume kirpik uygulamaları. Doğal ve etkileyici bakışlar — Avlu Arts.',
    headline: ['Makyajsız da', '<em>etkileyici</em> bakışlar.'],
    short: 'Kirpik lifting, ipek ve volume kirpikle doğal ya da dramatik bakışlar.',
    tags: ['Lifting', 'İpek kirpik', 'Volume'],
    card: 'img/kirpik/4.jpg',
    hero: ['img/kirpik/4.jpg', 'img/kirpik/2.jpg', 'img/kirpik/1.jpg'],
    intro: [
      'Uzun, dolgun ve kıvrık kirpikler için her sabah maskaraya gerek yok.',
      'Kirpik lifting, ipek kirpik ve volume kirpik uygulamalarını göz yapına ve tarzına göre tasarlıyoruz. Doğal kirpiklerine zarar vermeden, kaliteli ürünlerle çalışıyoruz.',
      'Sonuç: günlük makyaj rutinini kısaltan, her an bakımlı görünen bakışlar.',
    ],
    types: [
      ['Kirpik Lifting', 'Doğal kirpiklere kalıcı kıvrım ve belirginlik.'],
      ['İpek Kirpik', 'Tek tek uygulanan, doğal görünümlü uzatma.'],
      ['Volume Kirpik', 'Daha dolgun ve dramatik bir görünüm.'],
    ],
    care: [
      'İlk 24 saat kirpiklerini ıslatma ve buhardan uzak dur.',
      'Göz çevresinde yağ bazlı ürünler kullanma.',
      'Kirpiklerini ovma, çekme; yüzüstü yatmamaya özen göster.',
      'Kirpik fırçasıyla her gün nazikçe tara.',
    ],
    faq: [
      ['Kirpik lifting ne kadar kalıcı?', 'Kirpiklerin doğal yenilenme döngüsüne bağlı olarak genellikle birkaç hafta etkisini korur.'],
      ['İpek kirpik doğal kirpiklere zarar verir mi?', 'Doğru uzunluk ve ağırlık seçildiğinde ve bakım kurallarına uyulduğunda doğal kirpiklere zarar vermez.'],
    ],
    gallery: list('kirpik'),
  },
];

/* Nail Art hub (eski /corlu-nail-art/ adresi korunur) */
const NAIL_HUB = {
  key: 'nail', slug: 'corlu-nail-art', name: 'Nail Art', en: 'Nail Studio',
  title: 'Çorlu Nail Art',
  desc: 'Çorlu’da nail art: kalıcı oje, protez tırnak, manikür ve pedikür. Trend tasarımlar ve özenli bakım — Avlu Arts.',
  headline: ['Parmak uçlarında', '<em>sanat.</em>'],
  short: 'Kalıcı oje, protez tırnak, manikür ve pedikür — hepsi tek stüdyoda.',
  hero: ['img/nail/5.jpg', 'img/nail/36.jpg', 'img/nail/18.jpg'],
  intro: [
    'Tırnaklarını küçük birer sanat eserine dönüştürüyoruz.',
    'Sade ve zarif bir renkten detaylı el çizimlerine kadar; kalıcı oje, protez tırnak, manikür ve pedikür uygulamalarımızla tarzını parmak uçlarına taşıyoruz.',
    'Sezonun trendlerini takip ediyor, tasarımı el yapına ve tercihine göre birlikte oluşturuyoruz.',
  ],
  subs: ['protez', 'oje', 'manikur'],
  faq: [],
  gallery: list('nail'),
};

/* Tırnak fiyat listesi (stüdyonun güncel listesi) */
const PRICES = [
  ['Manikür', 800],
  ['Pedikür', 1200],
  ['Kalıcı Oje', 1400],
  ['Pedikür + Kalıcı Oje', 1600],
  ['Protez Tırnak', 1700, 'Jel rengi dahil'],
  ['Protez Tırnak + Kalıcı Oje', 1800],
  ['Jel Güçlendirme', 1500],
  ['Protez Tırnak Bakımı', 1500],
  ['Kalıcı Oje Çıkartma', 500],
  ['Protez Tırnak Çıkartma', 600],
  ['French, İnci Tozu', 200],
];
const PRICE_NOTES = [
  'Nail art ücretleri yapılacak tasarıma göre değişir.',
  'Kalıcı işlemlerde manikür fiyata dahildir.',
  'Peeling ve masaj, işlem sonunda hediyemizdir.',
  'Stüdyomuzda yapılmış işlemlerin bakımında çıkartma ücreti alınmaz.',
];
const tl = (n) => n.toLocaleString('tr-TR') + ' ₺';

const priceBlock = (base) => `
<section class="sec" id="fiyatlar">
  <div class="wrap prices">
    <div>
      <span class="eyebrow rv">Fiyat Listesi</span>
      <h2 class="h2 rv" style="margin-top:22px">Tırnak <em>hizmetleri</em></h2>
      <ul class="price-notes rv">${PRICE_NOTES.map((n) => `<li>${n}</li>`).join('')}</ul>
      <a class="btn btn--accent rv" href="${base}#randevu" style="margin-top:30px">Randevu Al ${I.arrow}</a>
    </div>
    <ul class="price-list rv rv-d1">
      ${PRICES.map(([n, p, s]) => `<li><span>${n}${s ? ` <small>${s}</small>` : ''}</span><i></i><b>${tl(p)}</b></li>`).join('\n      ')}
    </ul>
  </div>
</section>`;

const byKey = Object.fromEntries(SERVICES.map((s) => [s.key, s]));

/* ---------- parçalar ---------- */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const head = ({ title, desc, path, base, image = 'og.jpg', jsonld = '', preload = '' }) => `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<meta name="theme-color" content="#0d0c0b">
<meta property="og:type" content="website">
<meta property="og:locale" content="tr_TR">
<meta property="og:site_name" content="Avlu Arts">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${SITE}/${image}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${base}favicon.svg" type="image/svg+xml">
<link rel="preload" href="${base}fonts/instrument-serif-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${base}fonts/instrument-serif-latin-400-italic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${base}fonts/inter-tight-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
${preload}<link rel="stylesheet" href="${base}${CSS}">
${jsonld}
</head>
<body>
<a class="sr-only" href="#icerik">İçeriğe geç</a>`;

const header = (base, current = '') => {
  const h = base === '' ? '' : base; // ana sayfada çapa, alt sayfada ../#çapa
  const nav = [
    ['Hizmetler', `${h}#hizmetler`, 'hizmetler'],
    ['Portfolyo', `${h}#portfolyo`, 'portfolyo'],
    ['Stüdyo', `${h}#studyo`, 'studyo'],
    ['SSS', `${h}#sss`, 'sss'],
    ['İletişim', `${h}#iletisim`, 'iletisim'],
  ];
  const svcLinks = [...SERVICES.map((s) => [s.name, `${base}${s.slug}/`, s.key])];
  return `
<header class="hdr">
  <div class="wrap hdr__in">
    <a class="logo" href="${base || './'}" aria-label="Avlu Arts ana sayfa"><img src="${base}img/logo.webp" alt="Avlu Arts — Tattoo &amp; Nail Art" width="146" height="30" fetchpriority="high"></a>
    <nav class="nav" aria-label="Ana menü">
      ${nav.map(([t, u]) => `<a href="${u}">${t}</a>`).join('\n      ')}
    </nav>
    <div class="hdr__cta">
      <a class="icon-btn" href="${INFO.ig}" target="_blank" rel="noopener" aria-label="Instagram">${I.ig}</a>
      <a class="btn btn--accent" href="${h}#randevu">Randevu Al ${I.arrow}</a>
      <button class="icon-btn burger" aria-label="Menüyü aç" aria-expanded="false" aria-controls="mnav"><span></span><span></span></button>
    </div>
  </div>
</header>
<div class="mnav" id="mnav">
  ${svcLinks.map(([t, u, k], i) => `<a class="big" href="${u}"${k === current ? ' aria-current="page"' : ''}>${t}<small>0${i + 1}</small></a>`).join('\n  ')}
  <div class="mnav__foot">
    <a class="btn btn--accent" href="${h}#randevu">Randevu Al ${I.arrow}</a>
    <a class="btn btn--ghost" href="${h}#portfolyo">Portfolyo</a>
    <a class="icon-btn" href="${INFO.ig}" target="_blank" rel="noopener" aria-label="Instagram">${I.ig}</a>
  </div>
</div>`;
};

const footer = (base) => {
  const h = base;
  return `
<footer class="ftr">
  <div class="wrap">
    <div class="ftr__grid">
      <div class="ftr__brand">
        <img src="${base}img/logo.webp" alt="Avlu Arts" width="166" height="34" loading="lazy">
        <p>Dövme sanatını merkezine alan; piercing, nail art ve kirpik uygulamalarını aynı özenle sunan Çorlu’daki stüdyonuz.</p>
      </div>
      <div>
        <h4>Hizmetler</h4>
        <ul>${SERVICES.map((s) => `<li><a href="${base}${s.slug}/">${s.name}</a></li>`).join('')}</ul>
      </div>
      <div>
        <h4>Stüdyo</h4>
        <ul>
          <li><a href="${h}#studyo">Hakkımızda</a></li>
          <li><a href="${h}#portfolyo">Portfolyo</a></li>
          <li><a href="${base}corlu-nail-art/">Nail Art</a></li>
          <li><a href="${h}#sss">Sıkça Sorulanlar</a></li>
          <li><a href="${h}#randevu">Randevu</a></li>
        </ul>
      </div>
      <div>
        <h4>İletişim</h4>
        <ul>
          <li><a href="tel:${INFO.tel}">${INFO.phone}</a></li>
          <li><a href="mailto:${INFO.mail}">${INFO.mail}</a></li>
          <li><a href="${INFO.ig}" target="_blank" rel="noopener">Instagram ${INFO.igHandle}</a></li>
          <li><a href="${INFO.maps}" target="_blank" rel="noopener">${INFO.street}, ${INFO.city}</a></li>
        </ul>
      </div>
    </div>
    <div class="ftr__big" aria-hidden="true">Avlu Arts</div>
    <div class="ftr__bottom">
      <span>© <span data-year>2026</span> Avlu Arts — Tüm hakları saklıdır.</span>
      <span>Çorlu / Tekirdağ</span>
    </div>
  </div>
</footer>

<nav class="dock" aria-label="Hızlı iletişim">
  <a href="tel:${INFO.tel}">${I.phone} Ara</a>
  <a href="${waLink()}" target="_blank" rel="noopener">${I.wa} Yaz</a>
  <a class="primary" href="${h}#randevu">${I.cal} Randevu</a>
</nav>
<a class="wa-float" href="${waLink()}" target="_blank" rel="noopener" aria-label="WhatsApp ile yazın">${I.wa}</a>

<div class="lb" role="dialog" aria-modal="true" aria-label="Görsel önizleme" aria-hidden="true">
  <img alt="">
  <button class="lb__btn lb__close" aria-label="Kapat">${I.x}</button>
  <button class="lb__btn lb__prev" aria-label="Önceki">${I.l}</button>
  <button class="lb__btn lb__next" aria-label="Sonraki">${I.r}</button>
  <div class="lb__count"></div>
</div>
<script src="${base}${JS}" defer></script>
</body>
</html>
`;
};

const CAT_LABEL = { dovme: 'Dövme', nail: 'Nail Art', piercing: 'Piercing', kirpik: 'Kirpik' };
const catOf = (src) => ({ dovme: 'dovme', nail: 'nail', piercing: 'piercing', kirpik: 'kirpik' })[src.split('/')[1]];


const fig = (src, base, n) => {
  const c = catOf(src);
  return `<figure data-cat="${c}" data-full="${base}${largest(src)}">${pic(base, src, {
    sizes: '(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 340px',
    alt: `Avlu Arts ${CAT_LABEL[c].toLowerCase()} çalışması ${n}`,
  })}<figcaption>${CAT_LABEL[c]}</figcaption></figure>`;
};

const gallery = (imgs, base, step = 16) =>
  `<div class="masonry" data-step="${step}">\n${imgs.map((s, i) => fig(s, base, i + 1)).join('\n')}\n</div>
    <div class="more-wrap"><button class="btn btn--ghost" data-more>Daha fazla göster ${I.arrow}</button></div>`;

const faqBlock = (items, title = 'Merak <em>edilenler</em>') => `
<section class="sec" id="sss">
  <div class="wrap faq">
    <div class="rv">
      <span class="eyebrow">SSS</span>
      <h2 class="h2" style="margin-top:22px">${title}</h2>
      <p class="muted" style="margin-top:22px;max-width:32ch">Aklına takılan başka bir şey mi var? <a class="link-u" href="${waLink('Merhaba, bir sorum var:')}" target="_blank" rel="noopener" style="color:var(--bone)">WhatsApp’tan sor</a></p>
    </div>
    <div class="rv rv-d1">
      ${items.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${q}<i aria-hidden="true"></i></summary><p>${a}</p></details>`).join('\n      ')}
    </div>
  </div>
</section>`;

const ctaBlock = (base, imgs) => `
<section class="cta">
  ${imgs.map((s) => `<div class="cta__float" aria-hidden="true">${pic(base, s, { sizes: '190px' })}</div>`).join('')}
  <div class="wrap">
    <span class="eyebrow rv">${INFO.igHandle}</span>
    <h2 class="display rv" style="margin-top:24px">İzini<br><em class="accent">bırak.</em></h2>
    <p class="rv">Fikrin hazırsa ya da henüz sadece bir his varsa — yaz, birlikte şekillendirelim.</p>
    <div class="cta__actions rv">
      <a class="btn btn--accent" href="${waLink()}" target="_blank" rel="noopener">${I.wa} WhatsApp’tan Yaz</a>
      <a class="btn btn--ghost" href="${INFO.ig}" target="_blank" rel="noopener">${I.ig} Instagram’da Takip Et</a>
    </div>
  </div>
</section>`;

const jsonLd = (extra = {}) => `<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': ['TattooParlor', 'NailSalon'],
  name: 'Avlu Arts',
  url: SITE + '/',
  image: `${SITE}/img/genel/avlu-arts-corlu.jpg`,
  logo: `${SITE}/img/logo.webp`,
  telephone: INFO.tel,
  email: INFO.mail,
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Önerler Mahallesi Ziya Gökalp Bulvarı C Blok No: 21/1D',
    addressLocality: 'Çorlu',
    addressRegion: 'Tekirdağ',
    postalCode: '59850',
    addressCountry: 'TR',
  },
  sameAs: [INFO.ig],
  ...extra,
})}</script>`;

/* ---------- ana sayfa ---------- */
function interleave(...lists) {
  const out = [];
  const max = Math.max(...lists.map((l) => l.length));
  for (let i = 0; i < max; i++) lists.forEach((l) => l[i] && out.push(l[i]));
  return out;
}

function home() {
  const base = '';
  const dov = list('dovme'), nail = list('nail'), pie = list('piercing'), kir = list('kirpik');
  // öne çıkanlar önce, sonra karışık akış
  const featured = ['img/dovme/7.jpg', 'img/nail/36.jpg', 'img/dovme/40.jpg', 'img/kirpik/4.jpg', 'img/dovme/13.jpg', 'img/piercing/2.jpg', 'img/nail/5.jpg', 'img/dovme/38.jpg'];
  const rest = interleave(dov, nail, [...pie, ...kir].flatMap((x) => [x, null, null, null]).filter(Boolean)).filter((x) => !featured.includes(x));
  const all = [...featured, ...rest];
  const counts = { dovme: dov.length, nail: nail.length, piercing: pie.length, kirpik: kir.length };
  const wallCols = [
    ['img/dovme/38.jpg', 'img/nail/36.jpg', 'img/dovme/44.jpg', 'img/kirpik/3.jpg'],
    ['img/nail/5.jpg', 'img/dovme/13.jpg', 'img/piercing/4.jpg', 'img/dovme/25.jpg'],
    ['img/dovme/40.jpg', 'img/nail/18.jpg', 'img/dovme/7.jpg', 'img/nail/37.jpg'],
    ['img/kirpik/4.jpg', 'img/dovme/51.jpg', 'img/nail/9.jpg', 'img/dovme/30.jpg'],
    ['img/dovme/55.jpg', 'img/nail/27.jpg', 'img/dovme/11.jpg', 'img/kirpik/2.jpg'],
  ];

  const generalFaq = [
    ['Randevusuz gelebilir miyim?', 'Uygunluk durumuna göre karşılamaya çalışıyoruz; ancak sana ayıracağımız zamanı planlayabilmemiz için önceden randevu almanı öneririz.'],
    ['Fiyat bilgisi nasıl alabilirim?', 'Tırnak hizmetlerimizin güncel fiyatları yukarıdaki listede. Dövme ve piercing fiyatları ise boyuta, bölgeye ve detaya göre değişir; referans görselini WhatsApp’tan gönder, sana en kısa sürede net bilgi verelim.'],
    ['Hijyen konusunda nasıl çalışıyorsunuz?', 'Tüm uygulamalar steril ekipmanla yapılır; çalışma alanı her müşteri öncesinde yeniden hazırlanır. Merak ettiğin her adımı sorman için buradayız.'],
    ['Stüdyo nerede?', `${INFO.street}, ${INFO.city}. Önerler’de, Ziya Gökalp Bulvarı üzerindeyiz.`],
  ];

  return head({
    title: 'Avlu Arts — Çorlu Dövme, Piercing & Nail Art Stüdyosu',
    desc: 'Çorlu’da dövme, piercing, protez tırnak, kalıcı oje, manikür–pedikür ve kirpik uygulamaları. Kişiye özel tasarım, steril ortam. Randevu: 0534 762 19 89.',
    path: '/', base, jsonld: jsonLd(),
  }) + header(base) + `
<main id="icerik">
<section class="hero">
  <div class="hero__wall" aria-hidden="true">
    ${wallCols.map((col, ci) => `<div class="hero__col"><div class="hero__track">${[...col, ...col].map((s, i) => pic(base, s, {
      sizes: '(max-width: 760px) 36vw, 21vw',
      // mobilde gizlenen 4–5. sütunlar ve döngü kopyaları tembel yüklenir
      lazy: ci >= 3 || i >= col.length,
      priority: ci < 3 && i < 2 ? undefined : 'low',
    })).join('')}</div></div>`).join('\n    ')}
  </div>
  <div class="hero__shade"></div>
  <a class="reel fade-in" href="#portfolyo" aria-label="Stüdyodan kısa video — portfolyoya git">
    <video muted loop playsinline preload="none" poster="media/reel-poster.jpg" data-src="media/reel.mp4" aria-hidden="true"></video>
    <span class="reel__tag"><i></i> Stüdyodan</span>
  </a>
  <div class="wrap hero__in">
    <span class="eyebrow fade-in">Avlu Arts <span lang="en">Studio</span></span>
    <h1 class="display hero__title" style="margin-top:22px">
      <span class="line"><span>Tende kalan</span></span>
      <span class="line"><span><em>hikâyeler,</em></span></span>
      <span class="line"><span>zarif dokunuşlar.</span></span>
    </h1>
    <div class="hero__row fade-in">
      <p class="lead">Dövme, piercing, protez tırnak, manikür–pedikür ve kirpik — Çorlu’da, tek bir avluda.</p>
      <div class="hero__actions">
        <a class="btn btn--accent" href="#randevu">Randevu Al ${I.arrow}</a>
        <a class="btn btn--ghost" href="#portfolyo">Çalışmalarımız</a>
      </div>
    </div>
  </div>
</section>

<div class="marquee" aria-hidden="true"><div class="marquee__track">
  ${Array(2).fill(['Dövme', 'Piercing', 'Protez Tırnak', 'Kalıcı Oje', 'Manikür & Pedikür', 'Kirpik', 'Nail Art', 'Fine Line'].map((t) => `<span>${t}</span>`).join('')).join('')}
</div></div>

<section class="sec" id="studyo">
  <div class="wrap intro">
    <div class="intro__text">
      <span class="eyebrow rv">Stüdyo</span>
      <p class="statement rv">Avlu Arts; dövme sanatını merkezine alan, bakım ve güzelliği aynı sanatsal bakışla sunan bir <em>yaşam alanı.</em> <span class="muted">Her iş bir sohbetle başlar, sana ait bir izle biter.</span></p>
      <div class="pills rv">
        <span class="pill">Kişiye özel tasarım</span><span class="pill">Steril ortam</span><span class="pill">Modern teknikler</span><span class="pill">Önerler · Çorlu</span>
      </div>
      <div class="rv" style="margin-top:36px"><a class="link-u" href="#iletisim">Stüdyoyu ziyaret et ${I.arrow}</a></div>
    </div>
    <div class="intro__img rv rv-d1">
      ${pic(base, 'img/genel/avlu-arts-corlu.jpg', { sizes: '(max-width: 900px) 100vw, 40vw', alt: 'Avlu Arts Çorlu stüdyosu' })}
      <div class="intro__badge" aria-hidden="true">
        <svg viewBox="0 0 100 100"><defs><path id="c" d="M50 50m-38 0a38 38 0 1 1 76 0a38 38 0 1 1-76 0"/></defs><text font-size="9.2" letter-spacing="2.6" fill="#0d0c0b" font-family="Inter Tight, sans-serif"><textPath href="#c">AVLU ARTS · ÇORLU · TATTOO · NAIL ·</textPath></text></svg>
        <b>a</b>
      </div>
    </div>
  </div>
</section>

<section class="sec" id="hizmetler" style="padding-top:0">
  <div class="wrap">
    <div class="sec-head">
      <span class="eyebrow rv">Hizmetler</span>
      <h2 class="h2 rv">Ne <em>yapıyoruz?</em></h2>
      <p class="rv rv-d1">Kalıcı izlerden günlük bakıma; her uygulama aynı özen ve estetik bakışla.</p>
    </div>
    <div class="svc-grid">
      ${SERVICES.map((s, i) => `<a class="svc rv${i % 2 ? ' rv-d1' : ''}" href="${s.slug}/">
        ${pic(base, s.card, { sizes: i < 2 ? '(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 58vw' : '(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 25vw', alt: `${s.name} — Avlu Arts` })}
        <span class="svc__no">0${i + 1} — <span lang="en">${s.en}</span></span>
        <span class="svc__go">${I.ne}</span>
        <h3>${s.name}</h3>
        <p>${s.short}</p>
        <div class="svc__tags">${s.tags.map((t) => `<span>${t}</span>`).join('')}</div>
      </a>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="sec" id="portfolyo" style="background:var(--ink-2)">
  <div class="wrap">
    <div class="sec-head">
      <span class="eyebrow rv">Portfolyo</span>
      <h2 class="h2 rv">Son <em>çalışmalar</em></h2>
      <div class="filters rv rv-d1" role="group" aria-label="Kategori filtresi">
        <button data-f="all" aria-pressed="true">Tümü<sup>${all.length}</sup></button>
        ${Object.entries(counts).map(([k, n]) => `<button data-f="${k}" aria-pressed="false">${CAT_LABEL[k]}<sup>${n}</sup></button>`).join('\n        ')}
      </div>
    </div>
    ${gallery(all, base, 16)}
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="band rv">
      ${pic(base, 'img/dovme/1.jpg', { sizes: '100vw' })}
      <div>
        <span class="eyebrow">Hijyen & Güven</span>
        <h2 class="h2" style="margin:22px 0 20px">Steril ortam. <em>Özenli eller.</em></h2>
        <p>Steril ekipman, her uygulama öncesi yeniden hazırlanan çalışma alanı ve her adımda şeffaf bilgilendirme. Sanatı güvenle buluşturuyoruz.</p>
      </div>
    </div>
  </div>
</section>

<section class="sec" style="padding-top:0">
  <div class="wrap">
    <div class="sec-head">
      <span class="eyebrow rv">Süreç</span>
      <h2 class="h2 rv">Fikirden <em>ize</em></h2>
    </div>
    <div class="steps">
      ${[
        ['Tanışalım', 'WhatsApp’tan ya da stüdyoda; fikrini, referanslarını ve beklentini konuşalım.'],
        ['Tasarlayalım', 'Tarzına, yerleşime ve bütçene göre tasarımı birlikte netleştirelim.'],
        ['Uygulayalım', 'Steril ortamda, acele etmeden ve her detaya özen göstererek.'],
        ['Bakımını anlatalım', 'İyileşme ve kalıcılık için bakım adımlarını birlikte geçelim.'],
      ].map(([t, d], i) => `<div class="step rv${i ? ` rv-d${Math.min(i, 3)}` : ''}"><div class="step__n">0${i + 1}</div><h3>${t}</h3><p>${d}</p></div>`).join('\n      ')}
    </div>
  </div>
</section>

${priceBlock(base)}

${bookingBlock(base)}

${faqBlock(generalFaq)}

${mapBlock()}

${ctaBlock(base, ['img/dovme/11.jpg', 'img/nail/36.jpg', 'img/kirpik/2.jpg', 'img/dovme/44.jpg'])}
</main>` + footer(base);
}

function bookingBlock(base, preset = []) {
  const opts = [...SERVICES.map((s) => s.name), 'Diğer'];
  return `
<section class="sec" id="randevu">
  <div class="wrap book" id="iletisim">
    <div>
      <span class="eyebrow rv">Randevu & İletişim</span>
      <h2 class="h2 rv" style="margin-top:22px">Yerini <em>ayırt.</em></h2>
      <p class="lead rv" style="margin-top:22px">Formu doldur, talebin WhatsApp üzerinden bize ulaşsın. Uygunluğu kontrol edip en kısa sürede dönüş yapalım.</p>
      <ul class="contact-list rv">
        <li><a href="tel:${INFO.tel}"><span><small>Telefon</small><strong>${INFO.phone}</strong></span>${I.ne}</a></li>
        <li><a href="${waLink()}" target="_blank" rel="noopener"><span><small>WhatsApp</small><strong>${INFO.phone}</strong></span>${I.ne}</a></li>
        <li><a href="mailto:${INFO.mail}"><span><small>E-posta</small><strong>${INFO.mail}</strong></span>${I.ne}</a></li>
        <li><a href="${INFO.maps}" target="_blank" rel="noopener"><span><small>Adres</small><strong>${INFO.street}<br>${INFO.city}</strong></span>${I.ne}</a></li>
      </ul>
    </div>
    <form class="book__card rv rv-d1" id="randevu-form">
      <fieldset class="fld">
        <legend>Hangi hizmet?</legend>
        <div class="chips">
          ${opts.map((o) => `<label><input type="checkbox" name="hizmet" value="${o}"${preset.includes(o) ? ' checked' : ''}><span>${o}</span></label>`).join('\n          ')}
        </div>
      </fieldset>
      <div class="fld"><label for="f-ad">Ad Soyad</label><input id="f-ad" name="ad" required autocomplete="name" placeholder="Adın ve soyadın"></div>
      <div class="row2">
        <div class="fld"><label for="f-tarih">Tercih ettiğin gün</label><input id="f-tarih" type="date" name="tarih"></div>
        <div class="fld"><label for="f-saat">Saat aralığı</label><input id="f-saat" name="saat" placeholder="Örn. 14:00 – 17:00"></div>
      </div>
      <div class="fld"><label for="f-not">Notun</label><textarea id="f-not" name="not" placeholder="Fikrin, boyut, bölge ya da istediğin tasarım…"></textarea></div>
      <button class="btn btn--accent" type="submit" style="width:100%;justify-content:center">${I.wa} WhatsApp ile Gönder</button>
      <p class="form-note">Referans görsellerini WhatsApp sohbetinde paylaşabilirsin.</p>
    </form>
  </div>
</section>`;
}

function mapBlock() {
  const q = encodeURIComponent('Avlu Arts, Önerler Mahallesi Ziya Gökalp Bulvarı C Blok No:21/1D, Çorlu, Tekirdağ');
  return `
<section class="sec--tight" style="padding-top:0">
  <div class="wrap">
    <div class="map rv" data-map="https://www.google.com/maps?q=${q}&output=embed">
      <div class="map__facade">
        <span class="eyebrow">Konum</span>
        <p class="h3">${INFO.street}<br><em>${INFO.city}</em></p>
        <div class="hero__actions">
          <button class="btn btn--accent" type="button" data-map-load>Haritayı göster ${I.arrow}</button>
          <a class="btn btn--ghost" href="${INFO.maps}" target="_blank" rel="noopener">Yol tarifi al</a>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

/* ---------- hizmet sayfası ---------- */
function servicePage(s) {
  const base = '../';
  const others = SERVICES.filter((o) => o.key !== s.key);
  const subs = (s.subs || []).map((k) => byKey[k]);
  const preset = s.key === 'nail' ? [] : [s.name];
  return head({
    title: `${s.title} | Avlu Arts`,
    desc: s.desc,
    path: `/${s.slug}/`,
    base,
    image: largest(s.hero[0]),
    jsonld: jsonLd({
      '@type': 'Service', name: s.title, serviceType: s.name, areaServed: 'Çorlu',
      provider: { '@type': ['TattooParlor', 'NailSalon'], name: 'Avlu Arts', telephone: INFO.tel },
      address: undefined, sameAs: undefined, email: undefined, telephone: undefined, logo: undefined, url: `${SITE}/${s.slug}/`,
    }),
  }) + header(base, s.key) + `
<main id="icerik">
<section class="phero">
  <div class="wrap">
    <nav class="crumbs fade-in" aria-label="Sayfa yolu"><a href="../">Ana sayfa</a>${s.key !== 'nail' && ['protez', 'oje', 'manikur'].includes(s.key) ? '<span><a href="../corlu-nail-art/">Nail Art</a></span>' : ''}<span>${s.name}</span></nav>
    <div class="phero__grid">
      <div>
        <span class="eyebrow fade-in"><span lang="en">${s.en}</span> · Çorlu</span>
        <h1 class="display hero__title" style="margin-top:22px;font-size:clamp(50px,8.6vw,140px)">
          <span class="line"><span>${s.headline[0]}</span></span>
          <span class="line"><span>${s.headline[1]}</span></span>
        </h1>
      </div>
      <div class="fade-in">
        <p class="lead">${s.short}</p>
        <div class="hero__actions">
          <a class="btn btn--accent" href="#randevu">Randevu Al ${I.arrow}</a>
          <a class="btn btn--ghost" href="${waLink(`Merhaba, ${s.name} hakkında bilgi almak istiyorum.`)}" target="_blank" rel="noopener">${I.wa} Bilgi Al</a>
        </div>
      </div>
    </div>
    <div class="phero__img fade-in" style="display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:12px;border-radius:0;overflow:visible">
      ${s.hero.map((src, i) => pic(base, src, {
        sizes: i === 0 ? '(max-width: 900px) 40vw, 44vw' : '(max-width: 900px) 30vw, 28vw',
        alt: `${s.name} — Avlu Arts çalışması`,
        style: 'border-radius:var(--radius);width:100%;height:100%;object-fit:cover',
        lazy: false,
        priority: i === 0 ? 'high' : undefined,
      })).join('')}
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap prose-grid">
    <div><span class="eyebrow rv">${s.title}</span></div>
    <div class="prose rv">${s.intro.map((p) => `<p>${p}</p>`).join('')}</div>
  </div>
</section>

${subs.length ? `
<section class="sec" style="padding-top:0">
  <div class="wrap">
    <div class="sec-head"><span class="eyebrow rv" lang="en">Nail Studio</span><h2 class="h2 rv">Uygulamalar</h2></div>
    <div class="svc-grid">
      ${subs.map((o, i) => `<a class="svc rv" href="${base}${o.slug}/" style="grid-column:span 4;min-height:460px">${pic(base, o.card, { sizes: '(max-width: 640px) 100vw, 33vw', alt: o.name })}<span class="svc__no">0${i + 1} — <span lang="en">${o.en}</span></span><span class="svc__go">${I.ne}</span><h3>${o.name}</h3><p>${o.short}</p></a>`).join('\n      ')}
    </div>
  </div>
</section>` : ''}

${s.types ? `
<section class="sec" style="padding-top:0">
  <div class="wrap">
    <div class="sec-head"><span class="eyebrow rv">Uygulamalar</span><h2 class="h2 rv">Seçenekler</h2></div>
    <div class="types">
      ${s.types.map(([t, d], i) => `<div class="type rv"><i>0${i + 1}</i><b>${t}</b><p>${d}</p></div>`).join('\n      ')}
    </div>
  </div>
</section>` : ''}

<section class="sec" id="portfolyo" style="background:var(--ink-2)">
  <div class="wrap">
    <div class="sec-head"><span class="eyebrow rv">Portfolyo</span><h2 class="h2 rv">${s.name} <em>çalışmaları</em></h2></div>
    ${gallery(s.gallery, base, 12)}
  </div>
</section>

${s.care ? `
<section class="sec">
  <div class="wrap prose-grid">
    <div>
      <span class="eyebrow rv">Bakım</span>
      <h2 class="h2 rv" style="margin-top:22px">Sonrası da <em>önemli.</em></h2>
      <p class="muted rv" style="margin-top:18px;max-width:34ch">Detaylı bakım talimatlarını uygulama sonrasında sana ayrıca anlatıyoruz.</p>
    </div>
    <ol class="care rv">${s.care.map((c) => `<li>${c}</li>`).join('')}</ol>
  </div>
</section>` : ''}

${['nail', 'protez', 'oje', 'manikur'].includes(s.key) ? priceBlock(base) : ''}

${s.faq.length ? faqBlock(s.faq) : ''}

${bookingBlock(base, preset)}

<section class="sec" style="padding-top:0">
  <div class="wrap">
    <div class="sec-head"><span class="eyebrow rv">Keşfet</span><h2 class="h2 rv">Diğer <em>hizmetler</em></h2></div>
    <div class="others">
      ${others.map((o) => `<a class="other rv" href="${base}${o.slug}/">${pic(base, o.card, { sizes: '(max-width: 640px) 50vw, 20vw', alt: o.name })}<b>${o.name}</b></a>`).join('\n      ')}
    </div>
  </div>
</section>
</main>` + footer(base);
}

/* ---------- yaz ---------- */
writeFileSync(join(OUT, 'index.html'), home());
for (const s of [...SERVICES, NAIL_HUB]) {
  mkdirSync(join(OUT, s.slug), { recursive: true });
  writeFileSync(join(OUT, s.slug, 'index.html'), servicePage(s));
}

const urls = ['/', ...[...SERVICES, NAIL_HUB].map((s) => `/${s.slug}/`)];
writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}
</urlset>
`);
console.log('Üretildi:', urls.join(', '));
