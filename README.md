# Avlu Arts — Web Sitesi

Çorlu'daki Avlu Arts stüdyosunun (dövme, piercing, protez tırnak, kalıcı oje, manikür–pedikür, kirpik) statik web sitesi.

- **Yayın klasörü:** `public/` — Vercel doğrudan bu klasörü sunar, sunucuda build çalışmaz.
- **Kaynaklar:** `src/` (CSS/JS), `scripts/build.mjs` (sayfa içerikleri ve şablonlar), `raw/` (orijinal fotoğraf ve video).

## Kurulum

```bash
npm install
npm run dev        # http://localhost:4321
```

## İçerik güncelleme

| Ne değişecek | Nereden |
| --- | --- |
| Metinler, hizmetler, SSS, fiyat listesi, iletişim bilgileri | `scripts/build.mjs` |
| Stil / etkileşimler | `src/style.css`, `src/app.js` |
| Fotoğraflar | `raw/<klasör>/` (dovme, nail, piercing, kirpik, genel, yeni) |

Değişiklikten sonra:

```bash
npm run generate   # görselleri optimize eder + sayfaları public/ içine üretir
```

Yalnızca metin/stil değiştiyse `npm run pages` yeterlidir. Ardından `public/` ile birlikte commit edip push edin; Vercel otomatik yayınlar.

## Performans

- Görseller WebP'ye çevrilir, 400/800/1600 px genişliklerde `srcset` ile sunulur; boyutlar HTML'e yazılır (layout kayması yok).
- Tanıtım videosu 720p'ye sıkıştırılır (~250 KB) ve yalnızca masaüstünde, sayfa yüklendikten sonra indirilir.
- Fontlar yerel olarak sunulur (Google Fonts isteği yok), kritik olanlar önceden yüklenir.
- CSS/JS küçültülür ve içerik hash'li dosya adıyla 1 yıl önbelleğe alınır.
- Google Haritalar yalnızca "Haritayı göster" tıklanınca yüklenir.

## Vercel

Framework preset: **Other**. `package.json` içinde `build` betiği olmadığı için Vercel build çalıştırmaz; `vercel.json` `public/` klasörünü yayınlar. Ek ayar gerekmez.
