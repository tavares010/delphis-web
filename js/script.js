// ============ NAVBAR SCROLL ============
const navbar = document.getElementById('navbar');
const progressBar = document.getElementById('progressBar');

function onScroll() {
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 40);

  if (progressBar) {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = `${(scrollTop / docHeight) * 100}%`;
  }

  updateActiveNav();
}
window.addEventListener('scroll', onScroll, { passive: true });

// ============ ACTIVE NAV LINK ON SCROLL ============
const sections = document.querySelectorAll('main section[id], .hero[id]');
const navLinks = document.querySelectorAll('.nav-link');

function updateActiveNav() {
  let current = '';
  sections.forEach(sec => {
    const top = sec.offsetTop - 140;
    if (window.scrollY >= top) current = sec.getAttribute('id');
  });
  navLinks.forEach(link => {
    if (!link.dataset.section) return; // deja intacto el active fijo de páginas sin scroll-spy (curriculo.html, etc.)
    link.classList.toggle('active', link.dataset.section === current);
  });
}

// ============ MOBILE MENU ============
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');

if (burger && mobileMenu) {
  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
  });

  document.querySelectorAll('.mobile-link, .mobile-cta').forEach(link => {
    link.addEventListener('click', () => {
      burger.classList.remove('open');
      mobileMenu.classList.remove('open');
    });
  });
}

// ============ CURSOR GLOW ============
const cursorGlow = document.getElementById('cursorGlow');
if (cursorGlow && window.matchMedia('(pointer: fine)').matches) {
  window.addEventListener('mousemove', (e) => {
    cursorGlow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
  });
}

// ============ SCROLL REVEAL ============
const revealEls = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

revealEls.forEach(el => revealObserver.observe(el));

// ============ ANIMATED COUNTERS ============
const statNums = document.querySelectorAll('.stat__num');

function animateCount(el) {
  const target = parseFloat(el.dataset.count);
  const decimal = el.dataset.decimal;
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const duration = 1800;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    let value = target * eased;
    if (decimal) {
      value = value.toFixed(1);
    } else {
      value = Math.floor(value).toLocaleString('en-US');
    }
    el.textContent = prefix + value + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCount(entry.target);
      statObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

statNums.forEach(el => statObserver.observe(el));

// ============ WAVE CANVAS ============
const canvas = document.getElementById('waveCanvas');

if (canvas) {
  const ctx = canvas.getContext('2d');
  let waveWidth, waveHeight;

  function resizeCanvas() {
    waveWidth = canvas.width = canvas.offsetWidth;
    waveHeight = canvas.height = canvas.offsetHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  let t = 0;
  function drawWaves() {
    ctx.clearRect(0, 0, waveWidth, waveHeight);

    const layers = [
      { amp: 18, freq: 0.012, speed: 0.02, color: 'rgba(56,189,248,0.18)', offset: 0 },
      { amp: 24, freq: 0.008, speed: 0.014, color: 'rgba(37,99,235,0.16)', offset: 40 },
      { amp: 14, freq: 0.016, speed: 0.028, color: 'rgba(125,211,252,0.12)', offset: 70 },
    ];

    layers.forEach(layer => {
      ctx.beginPath();
      ctx.moveTo(0, waveHeight);
      for (let x = 0; x <= waveWidth; x += 6) {
        const y = waveHeight - layer.offset + Math.sin(x * layer.freq + t * layer.speed) * layer.amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(waveWidth, waveHeight);
      ctx.closePath();
      ctx.fillStyle = layer.color;
      ctx.fill();
    });

    t += 1;
    requestAnimationFrame(drawWaves);
  }
  drawWaves();
}

// ============ TESTIMONIAL CAROUSEL ============
const track = document.getElementById('carouselTrack');

if (track) {
  const cards = track.querySelectorAll('.testimonial-card');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const dotsWrap = document.getElementById('carouselDots');

  let current = 0;

  cards.forEach((_, i) => {
    const dot = document.createElement('span');
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });
  const dots = dotsWrap.querySelectorAll('span');

  function goTo(index) {
    current = (index + cards.length) % cards.length;
    track.scrollTo({ left: cards[current].offsetLeft - track.offsetLeft, behavior: 'smooth' });
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  let autoSlide = setInterval(() => goTo(current + 1), 6000);
  [prevBtn, nextBtn, track].forEach(el => {
    el.addEventListener('mouseenter', () => clearInterval(autoSlide));
    el.addEventListener('mouseleave', () => { autoSlide = setInterval(() => goTo(current + 1), 6000); });
  });
}

// ============ PRICING TOGGLE ============
const billingSwitch = document.getElementById('billingSwitch');

if (billingSwitch) {
  const labelMonthly = document.getElementById('labelMonthly');
  const labelYearly = document.getElementById('labelYearly');
  const amounts = document.querySelectorAll('.price-card__amount .amount');
  const periods = document.querySelectorAll('.price-card__amount .period');

  let isYearly = false;
  billingSwitch.addEventListener('click', () => {
    isYearly = !isYearly;
    billingSwitch.classList.toggle('on', isYearly);
    labelMonthly.classList.toggle('active', !isYearly);
    labelYearly.classList.toggle('active', isYearly);

    amounts.forEach(amount => {
      const value = isYearly ? amount.dataset.yearly : amount.dataset.monthly;
      amount.style.opacity = 0;
      setTimeout(() => {
        amount.textContent = value;
        amount.style.opacity = 1;
      }, 150);
    });
    periods.forEach(p => { p.textContent = isYearly ? '/mes, facturado anual' : '/mes'; });
  });
}

// ============ FAQ ACCORDION ============
document.querySelectorAll('.accordion-item').forEach(item => {
  const head = item.querySelector('.accordion-item__head');
  head.addEventListener('click', () => {
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

// ============ FORMS (checkout / ebook capture) ============
document.querySelectorAll('#checkoutForm, #ebookForm, #ebookForm2').forEach(form => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    const original = btn.innerHTML;
    btn.innerHTML = '¡Listo! Revisa tu correo ✓';
    btn.style.pointerEvents = 'none';
    setTimeout(() => {
      btn.innerHTML = original;
      btn.style.pointerEvents = 'auto';
      form.reset();
    }, 2600);
  });
});

// ============ COUNTDOWN TIMERS (ebook: home teaser + dedicated page) ============
const countdowns = document.querySelectorAll('[data-target]');

if (countdowns.length) {
  function pad(n) { return String(Math.max(n, 0)).padStart(2, '0'); }

  function tickCountdowns() {
    countdowns.forEach(box => {
      const target = new Date(box.dataset.target).getTime();
      const diff = target - Date.now();

      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      const set = (key, value) => {
        const el = box.querySelector(`[data-cd="${key}"]`);
        if (el) el.textContent = pad(value);
      };
      set('days', days);
      set('hours', hours);
      set('minutes', minutes);
      set('seconds', seconds);
    });
  }
  tickCountdowns();
  setInterval(tickCountdowns, 1000);
}

// ============ HERO: máquina de escribir con los 5 idiomas reales del curso ============
const heroTypingEl = document.getElementById('heroTyping');
if (heroTypingEl && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const HERO_IDIOMAS = ['inglés', 'francés', 'alemán', 'italiano', 'portugués'];
  let heroWordIdx = 0;
  let heroCharIdx = HERO_IDIOMAS[0].length; // arranca mostrando "inglés" ya escrito, como en el HTML
  let heroDeleting = true;

  // El orden de HERO_IDIOMAS es el mismo que CURSOS (en/fr/de/it/pt) en
  // js/courses.js -así cada palabra usa el degradado REAL de su curso
  // (el mismo que ves al cambiar de idioma en la app), no uno inventado
  // aparte. Ej: portugués = rojo y verde, como el resto del tema.
  function heroSetTypingColors(idx) {
    const curso = typeof CURSOS !== 'undefined' && CURSOS[idx];
    if (!curso) return;
    heroTypingEl.style.setProperty('--typing-a', curso.colorA);
    heroTypingEl.style.setProperty('--typing-b', curso.colorB);
  }
  heroSetTypingColors(0);

  function heroTypingTick() {
    const word = HERO_IDIOMAS[heroWordIdx];
    let delay;
    if (heroDeleting) {
      heroCharIdx--;
      heroTypingEl.textContent = word.slice(0, heroCharIdx);
      delay = 45;
      if (heroCharIdx <= 0) {
        heroDeleting = false;
        heroWordIdx = (heroWordIdx + 1) % HERO_IDIOMAS.length;
        heroSetTypingColors(heroWordIdx);
        delay = 300;
      }
    } else {
      const nextWord = HERO_IDIOMAS[heroWordIdx];
      heroCharIdx++;
      heroTypingEl.textContent = nextWord.slice(0, heroCharIdx);
      delay = 85;
      if (heroCharIdx >= nextWord.length) {
        heroDeleting = true;
        delay = 1700;
      }
    }
    setTimeout(heroTypingTick, delay);
  }
  setTimeout(heroTypingTick, 2000);
}

// init
onScroll();
