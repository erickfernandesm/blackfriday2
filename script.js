// Endereço para onde os leads serão enviados (ex.: webhook do RD Station,
// Zapier, Make, Google Apps Script). Deixe vazio para apenas simular o envio.
const LEAD_ENDPOINT = '';

// Abre o formulário sozinho depois de X segundos na página (0 = desativado).
// Aparece uma única vez por visitante e nunca para quem já abriu ou se cadastrou.
const AUTO_OPEN_SECONDS = 25;

// Frases que correm nas faixas do topo e do rodapé (alternam entre si)
const MARQUEE_PHRASES = ['BLACK FRIDAY SOLUTE', 'CONDIÇÕES EXCLUSIVAS AO VIVO'];

// Velocidade das faixas em pixels por segundo (menor = mais devagar)
const MARQUEE_SPEED = 40;

// ---------------- faixas ----------------
// Cada faixa tem duas metades iguais: a animação anda 50% e recomeça sem emenda.
(() => {
  const star = '<svg viewBox="0 0 480 512" aria-hidden="true"><path d="M471.99 334.43L336.06 256l135.93-78.43c7.66-4.42 10.28-14.2 5.86-21.86l-32.02-55.43c-4.42-7.65-14.21-10.28-21.87-5.86l-135.93 78.43V16c0-8.84-7.17-16-16.01-16h-64.04c-8.84 0-16.01 7.16-16.01 16v156.86L56.04 94.43c-7.66-4.42-17.45-1.79-21.87 5.86L2.15 155.71c-4.42 7.65-1.8 17.44 5.86 21.86L143.94 256 8.01 334.43c-7.66 4.42-10.28 14.21-5.86 21.86l32.02 55.43c4.42 7.65 14.21 10.27 21.87 5.86l135.93-78.43V496c0 8.84 7.17 16 16.01 16h64.04c8.84 0 16.01-7.16 16.01-16V339.14l135.93 78.43c7.66 4.42 17.45 1.8 21.87-5.86l32.02-55.43c4.42-7.65 1.8-17.43-5.86-21.85z"/></svg>';

  document.querySelectorAll('.marquee-track').forEach(track => {
    const item = text => `<span class="marquee-item">${text}${star}</span>`;
    const half = MARQUEE_PHRASES.map(item).join('');
    // repete até uma metade ficar mais larga que a tela (inclusive monitores largos)
    const minWidth = Math.max(window.screen.width, window.innerWidth, 1920) * 1.2;
    track.innerHTML = half;
    let reps = 1;
    while (track.scrollWidth < minWidth && reps < 30) {
      track.innerHTML += half;
      reps++;
    }
    const halfWidth = track.scrollWidth;
    track.innerHTML += track.innerHTML;
    // mesma velocidade em qualquer tela, não importa quantas vezes a frase repetiu
    track.style.animationDuration = `${halfWidth / MARQUEE_SPEED}s`;
  });
})();

// ---------------- formulário ----------------
const modal = document.getElementById('cadastro');
const form = document.getElementById('leadForm');
const success = document.getElementById('formSuccess');
const errorBox = document.getElementById('formError');

// localStorage pode falhar (aba anônima, cookies bloqueados): nesse caso só ignora
const storage = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

function openForm(e) {
  e?.preventDefault();
  storage.set('bf_form_seen', '1');
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => form.querySelector('input')?.focus(), 50);
}

function closeForm() {
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

document.querySelectorAll('.js-open-form').forEach(el => el.addEventListener('click', openForm));
document.querySelectorAll('.js-close-form').forEach(el => el.addEventListener('click', closeForm));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeForm(); });

if (AUTO_OPEN_SECONDS > 0 && !storage.get('bf_form_seen') && !storage.get('bf_lead_sent')) {
  setTimeout(() => {
    if (!modal.classList.contains('is-open') && !storage.get('bf_form_seen')) openForm();
  }, AUTO_OPEN_SECONDS * 1000);
}

// Máscara simples de WhatsApp: (00) 00000-0000
form.whatsapp.addEventListener('input', e => {
  const d = e.target.value.replace(/\D/g, '').slice(0, 11);
  let v = d;
  if (d.length > 2) v = `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length > 7) v = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  e.target.value = v;
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  errorBox.hidden = true;

  const data = {
    nome: form.nome.value.trim(),
    email: form.email.value.trim(),
    whatsapp: form.whatsapp.value.trim(),
  };

  if (!data.nome || !/^\S+@\S+\.\S+$/.test(data.email) || data.whatsapp.replace(/\D/g, '').length < 10) {
    errorBox.textContent = 'Preencha nome, e-mail válido e WhatsApp com DDD.';
    errorBox.hidden = false;
    return;
  }

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'ENVIANDO...';

  try {
    if (LEAD_ENDPOINT) {
      const res = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(res.status);
    }
    storage.set('bf_lead_sent', '1');
    form.hidden = true;
    success.hidden = false;
  } catch {
    errorBox.textContent = 'Não foi possível enviar agora. Tente novamente.';
    errorBox.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'QUERO ENTRAR NA LISTA DA LIVE';
  }
});
