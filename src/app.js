(() => {
  const WA = '905347621989';
  const root = document.documentElement;

  /* header: solid after scroll, hide on scroll down */
  const hdr = document.querySelector('.hdr');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    hdr.classList.toggle('is-solid', y > 40);
    hdr.classList.toggle('is-hidden', y > 400 && y > lastY && !root.classList.contains('menu-open'));
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* mobile menu */
  const burger = document.querySelector('.burger');
  const setMenu = (open) => {
    root.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger?.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  document.querySelectorAll('.mnav a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* reveal on scroll */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.rv').forEach((el) => io.observe(el));

  /* reel video: yalnızca geniş ekranda, hareket azaltma / veri tasarrufu kapalıyken yüklenir */
  const vid = document.querySelector('video[data-src]');
  const saver = navigator.connection && navigator.connection.saveData;
  if (vid && !saver && matchMedia('(min-width: 1001px) and (prefers-reduced-motion: no-preference)').matches) {
    const load = () => { vid.src = vid.dataset.src; vid.play().catch(() => {}); };
    'requestIdleCallback' in window ? requestIdleCallback(load, { timeout: 2500 }) : setTimeout(load, 1200);
  }

  /* harita: Google Maps yalnızca istenince yüklenir (ağır üçüncü taraf betik) */
  document.querySelectorAll('[data-map-load]').forEach((b) => b.addEventListener('click', () => {
    const box = b.closest('[data-map]');
    const f = document.createElement('iframe');
    f.src = box.dataset.map;
    f.title = 'Avlu Arts konumu';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    f.allowFullscreen = true;
    box.replaceChildren(f);
  }));

  /* gallery: filters + load more */
  const gal = document.querySelector('.masonry');
  const figs = gal ? [...gal.querySelectorAll('figure')] : [];
  const moreBtn = document.querySelector('[data-more]');
  const STEP = Number(gal?.dataset.step) || 16;
  let cat = 'all';
  let limit = STEP;
  const visible = () => figs.filter((f) => cat === 'all' || f.dataset.cat === cat);
  const render = () => {
    const vis = visible();
    figs.forEach((f) => (f.hidden = true));
    vis.forEach((f, i) => (f.hidden = i >= limit));
    if (moreBtn) moreBtn.parentElement.hidden = vis.length <= limit;
  };
  document.querySelectorAll('.filters button').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.filters button').forEach((x) => x.setAttribute('aria-pressed', x === b));
      cat = b.dataset.f;
      limit = STEP;
      render();
    });
  });
  moreBtn?.addEventListener('click', () => { limit += STEP; render(); });
  if (gal) render();

  /* lightbox */
  const lb = document.querySelector('.lb');
  if (lb && figs.length) {
    const img = lb.querySelector('img');
    const count = lb.querySelector('.lb__count');
    let list = [];
    let i = 0;
    let lastFocus;
    const show = () => {
      const f = list[i];
      img.src = f.dataset.full || f.querySelector('img').src;
      img.alt = f.querySelector('img').alt;
      count.textContent = `${String(i + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
    };
    const open = (f) => {
      list = figs.filter((x) => !x.hidden);
      i = list.indexOf(f);
      lastFocus = document.activeElement;
      show();
      lb.classList.add('is-open');
      lb.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      lb.querySelector('.lb__close').focus();
    };
    const close = () => {
      lb.classList.remove('is-open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      lastFocus?.focus();
    };
    const step = (d) => { i = (i + d + list.length) % list.length; show(); };
    figs.forEach((f) => {
      f.tabIndex = 0;
      f.setAttribute('role', 'button');
      f.addEventListener('click', () => open(f));
      f.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(f); } });
    });
    lb.querySelector('.lb__close').addEventListener('click', close);
    lb.querySelector('.lb__prev').addEventListener('click', () => step(-1));
    lb.querySelector('.lb__next').addEventListener('click', () => step(1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
    let sx = 0;
    lb.addEventListener('touchstart', (e) => (sx = e.touches[0].clientX), { passive: true });
    lb.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    });
  }

  /* booking form → WhatsApp */
  const form = document.querySelector('#randevu-form');
  const dateIn = form?.querySelector('[name="tarih"]');
  if (dateIn) dateIn.min = new Date().toISOString().slice(0, 10);
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const services = d.getAll('hizmet');
    const date = d.get('tarih') ? new Date(d.get('tarih')).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }) : '';
    const lines = [
      'Merhaba Avlu Arts, randevu almak istiyorum.',
      '',
      `Ad Soyad: ${d.get('ad')}`,
      services.length ? `Hizmet: ${services.join(', ')}` : '',
      date ? `Tercih ettiğim gün: ${date}` : '',
      d.get('saat') ? `Saat aralığı: ${d.get('saat')}` : '',
      d.get('not') ? `Not: ${d.get('not')}` : '',
    ].filter((l, idx) => idx < 2 || l);
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
  });

  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
})();
