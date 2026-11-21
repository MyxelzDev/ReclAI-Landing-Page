(() => {
  const STORAGE_KEY = 'reclai_tickets_v1';

  // Catálogo inicial de empresas afiliadas (HU-09, HU-10)
  const COMPANIES = [
    { name: 'El Rey de la Papa S.A.C.', ruc: '20512345678', sector: 'Gastronomía', slaRate: '94% resueltos < 48h' },
    { name: 'UPC Servicios Académicos', ruc: '20211614545', sector: 'Educación Superior', slaRate: '91% resueltos en plazo' },
    { name: 'TechStore Perú E.I.R.L.', ruc: '20604589123', sector: 'Retail / Tecnología', slaRate: '88% resueltos < 72h' },
    { name: 'RapiEntrega Express S.A.', ruc: '20559871234', sector: 'Logística y Delivery', slaRate: '89% resueltos en plazo' }
  ];

  // Datos iniciales idénticos a Mockups 3, 4 y 5 del informe
  const DEFAULT_TICKETS = [
    {
      id: '#REC-2026-001',
      client: 'Valeria Quispe',
      company: 'El Rey de la Papa S.A.C.',
      category: 'Logística - Entregas',
      frustration: 'Alta Frustración',
      daysLeft: 2,
      status: 'Pendiente',
      step: 2,
      claimType: 'Devolución de dinero',
      amount: 'S/ 350.00',
      summary: [
        'Pedido N° 8842 entregado con el empaque y el producto dañados.',
        'La clienta indica que no recibió respuesta previa de la empresa.',
        'Solicita la devolución total del monto pagado.',
        'Adjuntó boleta de compra B001-8842, validada por OCR.'
      ],
      originalChat: [
        { sender: 'bot', time: '10:02 a. m.', text: 'Hola Valeria, cuéntame con tus propias palabras qué pasó con tu pedido.' },
        { sender: 'user', time: '10:03 a. m.', text: 'El paquete llegó roto y nadie me responde, quiero mi dinero.' },
        { sender: 'bot', time: '10:03 a. m.', text: 'Lamento mucho el inconveniente. Entiendo que solicitas la devolución de tu dinero. ¿Podrías subir una foto de tu boleta?' },
        { sender: 'user', time: '10:04 a. m.', text: 'Adjunté boleta_8842.jpg (Monto S/ 350.00, Pedido N° 8842).' }
      ],
      history: [
        'Reclamo registrado vía chat con IA · 10:02 a. m.',
        'Boleta procesada con OCR (Pedido N° 8842) · 10:04 a. m.',
        'IA clasificó: Logística - Entregas · Alta frustración · 10:05 a. m.'
      ]
    },
    {
      id: '#REC-2026-004',
      client: 'Marco Linares',
      company: 'TechStore Perú E.I.R.L.',
      category: 'Facturación - Cobro duplicado',
      frustration: 'Frustración Media',
      daysLeft: 5,
      status: 'En revisión',
      step: 2,
      claimType: 'Anulación de cobro',
      amount: 'S/ 189.00',
      summary: [
        'Se registró un doble cargo en tarjeta por la compra de accesorios.',
        'Adjuntó captura del estado de cuenta bancario.',
        'Solicita el extorno del segundo cobro.'
      ],
      originalChat: [
        { sender: 'user', time: '09:15 a. m.', text: 'Me cobraron dos veces los 189 soles de mi compra.' }
      ],
      history: ['Reclamo registrado vía chat con IA · 09:15 a. m.']
    },
    {
      id: '#REC-2026-007',
      client: 'Andrea Salas',
      company: 'UPC Servicios Académicos',
      category: 'Trámite - Recalificación',
      frustration: 'Alta Frustración',
      daysLeft: 6,
      status: 'Pendiente',
      step: 1,
      claimType: 'Revisión académica',
      amount: 'S/ 0.00',
      summary: [
        'Solicita revisión del puntaje en evaluación parcial por error de suma.',
        'Adjuntó captura de rúbrica publicada en aula virtual.'
      ],
      originalChat: [
        { sender: 'user', time: '14:20 p. m.', text: 'Mi nota está mal sumada y cierra el plazo de reclamos hoy.' }
      ],
      history: ['Reclamo registrado vía chat con IA · 14:20 p. m.']
    },
    {
      id: '#REC-2026-003',
      client: 'Luis Paredes',
      company: 'RapiEntrega Express S.A.',
      category: 'Atención - Trato al cliente',
      frustration: 'Baja Frustración',
      daysLeft: 11,
      status: 'Pendiente',
      step: 1,
      claimType: 'Disculpas formales',
      amount: 'S/ 0.00',
      summary: [
        'Reporta demora en la entrega sin aviso previo del repartidor.'
      ],
      originalChat: [
        { sender: 'user', time: '16:00 p. m.', text: 'El pedido llegó 40 minutos tarde sin aviso.' }
      ],
      history: ['Reclamo registrado vía chat con IA · 16:00 p. m.']
    }
  ];

  // Estado de la aplicación
  let tickets = loadTickets();
  let selectedCompany = COMPANIES[0].name;
  let activeTicketId = tickets[0].id;
  let draftChat = [
    { sender: 'bot', time: 'Ahora', text: 'Hola 👋 Soy el asistente de ReclAI. Cuéntame con tus propias palabras qué ocurrió con tu compra o servicio.' }
  ];
  let draftOcrAttached = false;
  let voiceInterval = null;
  let voiceSeconds = 0;

  function loadTickets() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [...DEFAULT_TICKETS];
  }

  function saveTickets() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  }

  function showToast(message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  // 1. Navegación móvil
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const navLinks = document.getElementById('navLinks');
  mobileMenuBtn.addEventListener('click', () => {
    const expanded = navLinks.classList.toggle('open');
    mobileMenuBtn.setAttribute('aria-expanded', String(expanded));
  });

  // 2. Buscador Predictivo de Empresas (HU-09, HU-10)
  const searchInput = document.getElementById('companySearchInput');
  const companyResults = document.getElementById('companyResults');

  function renderCompanySearch(query) {
    const term = query.trim().toLowerCase();
    companyResults.innerHTML = '';

    if (term.length > 0 && term.length < 3) {
      companyResults.innerHTML = '<small class="text-muted">Ingresa al menos 3 caracteres para buscar...</small>';
      return;
    }

    const matches = term.length === 0
      ? [COMPANIES[0]]
      : COMPANIES.filter(c => c.name.toLowerCase().includes(term) || c.sector.toLowerCase().includes(term));

    if (matches.length === 0) {
      companyResults.innerHTML = `
        <div class="company-item">
          <div>
            <strong>No encontramos "${query}"</strong>
            <div class="text-muted" style="font-size:0.85rem;">Puedes registrar tu reclamo igualmente como empresa no afiliada.</div>
          </div>
          <button type="button" class="btn btn-sm btn-primary" onclick="document.getElementById('openUnregisteredModal').click()">Registrar</button>
        </div>
      `;
      return;
    }

    matches.forEach(comp => {
      const div = document.createElement('div');
      div.className = 'company-item';
      div.setAttribute('tabindex', '0');
      div.innerHTML = `
        <div>
          <strong>${comp.name}</strong>
          <div class="text-muted" style="font-size:0.85rem;">RUC ${comp.ruc} · ${comp.sector} · <span class="text-teal">${comp.slaRate}</span></div>
        </div>
        <span class="meta-tag">Iniciar Reclamo →</span>
      `;
      div.addEventListener('click', () => {
        selectedCompany = comp.name;
        document.getElementById('selectedCompanyLabel').textContent = `Empresa: ${selectedCompany}`;
        switchPortal('b2c');
        document.getElementById('workspace-demo').scrollIntoView({ behavior: 'smooth' });
        showToast(`Reclamo iniciado para ${selectedCompany}`);
      });
      companyResults.appendChild(div);
    });
  }

  searchInput.addEventListener('input', (e) => renderCompanySearch(e.target.value));
  document.getElementById('searchBtn').addEventListener('click', () => renderCompanySearch(searchInput.value));

  // 3. Switcher B2C / B2B
  const tabB2C = document.getElementById('tabB2C');
  const tabB2B = document.getElementById('tabB2B');
  const portalB2C = document.getElementById('portalB2C');
  const portalB2B = document.getElementById('portalB2B');
  const quickRoleToggle = document.getElementById('quickRoleToggle');

  function switchPortal(portal) {
    const isB2C = portal === 'b2c';
    tabB2C.classList.toggle('active', isB2C);
    tabB2B.classList.toggle('active', !isB2C);
    tabB2C.setAttribute('aria-selected', String(isB2C));
    tabB2B.setAttribute('aria-selected', String(!isB2C));
    portalB2C.classList.toggle('hidden', !isB2C);
    portalB2B.classList.toggle('hidden', isB2C);
    quickRoleToggle.textContent = isB2C ? 'Cambiar a Portal Empresa' : 'Cambiar a Portal Cliente';
    if (!isB2C) renderB2BInbox();
  }

  tabB2C.addEventListener('click', () => switchPortal('b2c'));
  tabB2B.addEventListener('click', () => switchPortal('b2b'));
  quickRoleToggle.addEventListener('click', () => {
    const currentlyB2C = !portalB2C.classList.contains('hidden');
    switchPortal(currentlyB2C ? 'b2b' : 'b2c');
    document.getElementById('workspace-demo').scrollIntoView({ behavior: 'smooth' });
  });

  // Subtabs B2C
  document.querySelectorAll('.subtab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.subtab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.b2cView;
      document.getElementById('b2cChatView').classList.toggle('hidden', target !== 'chat');
      document.getElementById('b2cMisReclamosView').classList.toggle('hidden', target !== 'mis-reclamos');
      if (target === 'mis-reclamos') renderB2CTickets();
    });
  });

  // 4. Chatbot Multimodal IA (HU-14, HU-15, HU-16, HU-18, HU-20)
  const chatMessagesEl = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');

  function renderChat() {
    chatMessagesEl.innerHTML = '';
    draftChat.forEach(m => {
      const div = document.createElement('div');
      div.className = `msg ${m.sender === 'bot' ? 'msg-bot' : 'msg-user'}`;
      div.innerHTML = `<span class="msg-meta">${m.sender === 'bot' ? 'ReclAI' : 'Tú'} · ${m.time}</span>${m.text}`;
      chatMessagesEl.appendChild(div);
    });
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }

  function appendBotReply(userText) {
    const lower = userText.toLowerCase();
    let reply = 'Entiendo perfectamente tu malestar. He registrado los hechos clave. ¿Podrías indicarme qué solución esperas (ej. devolución de dinero o cambio) y adjuntar tu comprobante si lo tienes?';

    if (lower.includes('devol') || lower.includes('dinero') || lower.includes('reembolso')) {
      reply = 'Anotado: tu pretensión es la devolución de tu dinero. Cuando estés listo, presiona "✅ Revisar Precierre y Enviar" para validar tu ficha.';
    } else if (lower.includes('boleta') || lower.includes('foto')) {
      reply = '¡Genial! Puedes usar el botón "📎 Adjuntar Boleta (Demo OCR)" para que extraiga el monto y número de pedido automáticamente.';
    }

    setTimeout(() => {
      draftChat.push({ sender: 'bot', time: 'Ahora', text: reply });
      renderChat();
    }, 350);
  }

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    draftChat.push({ sender: 'user', time: 'Ahora', text });
    chatInput.value = '';
    renderChat();
    appendBotReply(text);
  });

  // Copiar código único (HU-14 CA05)
  document.getElementById('copyCodeBtn').addEventListener('click', () => {
    const code = document.getElementById('activeDraftCode').textContent;
    navigator.clipboard?.writeText(code);
    showToast(`Código ${code} copiado al portapapeles`);
  });

  // Simulación de Nota de Voz (HU-18)
  const voiceBar = document.getElementById('voiceRecordingBar');
  const recTimer = document.getElementById('recTimer');
  document.getElementById('toggleVoiceBtn').addEventListener('click', () => {
    if (!voiceBar.classList.contains('hidden')) return;
    voiceSeconds = 1;
    recTimer.textContent = '0:01';
    voiceBar.classList.remove('hidden');
    voiceInterval = setInterval(() => {
      voiceSeconds++;
      recTimer.textContent = `0:${voiceSeconds < 10 ? '0' + voiceSeconds : voiceSeconds}`;
    }, 1000);
  });

  function stopVoice() {
    clearInterval(voiceInterval);
    voiceBar.classList.add('hidden');
  }

  document.getElementById('cancelVoiceBtn').addEventListener('click', stopVoice);
  document.getElementById('sendVoiceBtn').addEventListener('click', () => {
    stopVoice();
    const transcribed = '🎤 [Nota de voz transcrita]: "Compré un pedido ayer, llegó dañado y necesito que me devuelvan los S/ 150 que pagué."';
    draftChat.push({ sender: 'user', time: 'Ahora', text: transcribed });
    renderChat();
    appendBotReply(transcribed);
    showToast('Audio transcrito con Speech-to-Text IA');
  });

  // Simulación OCR Boleta (HU-16)
  document.getElementById('simulateOcrBtn').addEventListener('click', () => {
    if (draftOcrAttached) {
      showToast('Ya adjuntaste una boleta validada en este borrador');
      return;
    }
    draftOcrAttached = true;
    draftChat.push({
      sender: 'user',
      time: 'Ahora',
      text: `Comprobante adjunto<div class="ocr-attachment">📄 <strong>boleta_9910.jpg · OCR Validado</strong><br>Datos extraídos: Monto S/ 150.00 · Pedido N° 9910</div>`
    });
    renderChat();
    setTimeout(() => {
      draftChat.push({
        sender: 'bot',
        time: 'Ahora',
        text: 'He extraído los datos de tu boleta (Pedido N° 9910 por S/ 150.00). Ya tienes todo listo para revisar el precierre y enviar tu reclamo.'
      });
      renderChat();
    }, 350);
  });

  document.getElementById('resetChatBtn').addEventListener('click', () => {
    draftChat = [{ sender: 'bot', time: 'Ahora', text: 'Conversación reiniciada. Cuéntame qué ocurrió con tu servicio.' }];
    draftOcrAttached = false;
    renderChat();
    showToast('Chat reiniciado');
  });

  // 5. Modal Precierre y Confirmación (HU-20, HU-22)
  const appModal = document.getElementById('appModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');

  function openModal(title, htmlContent) {
    modalTitle.textContent = title;
    modalBody.innerHTML = htmlContent;
    appModal.classList.remove('hidden');
  }

  document.getElementById('closeModalBtn').addEventListener('click', () => appModal.classList.add('hidden'));
  appModal.addEventListener('click', (e) => {
    if (e.target === appModal) appModal.classList.add('hidden');
  });

  document.getElementById('openPrecloseBtn').addEventListener('click', () => {
    const userMsgs = draftChat.filter(m => m.sender === 'user').map(m => m.text.replace(/<[^>]*>/g, ' ')).join(' ');
    const summaryText = userMsgs || 'Inconformidad con producto/servicio recibido.';
    const amount = draftOcrAttached ? 'S/ 150.00' : 'S/ 85.00';

    openModal('Ficha de Precierre — Validación de Datos', `
      <div class="sub-card" style="margin-bottom:1rem;">
        <p><strong>Empresa:</strong> ${selectedCompany}</p>
        <p><strong>Hechos sintetizados (IA):</strong> ${summaryText}</p>
        <p><strong>Pretensión detectada:</strong> Devolución de dinero</p>
        <p><strong>Monto involucrado:</strong> ${amount}</p>
        <p><strong>Plazo legal máximo de respuesta:</strong> 15 días hábiles (INDECOPI)</p>
      </div>
      <label style="display:flex; gap:0.5rem; align-items:flex-start; margin-bottom:1rem; cursor:pointer;">
        <input type="checkbox" id="veracidadCheck" style="min-width:20px; min-height:20px; margin-top:2px;">
        <span>Declaro que los datos consignados son verdaderos y autorizo su envío formal.</span>
      </label>
      <button type="button" class="btn btn-primary full-width" id="confirmSendTicketBtn">Confirmar y Enviar Reclamo</button>
    `);

    document.getElementById('confirmSendTicketBtn').addEventListener('click', () => {
      if (!document.getElementById('veracidadCheck').checked) {
        showToast('⚠ Debes aceptar la declaración de veracidad antes de enviar');
        return;
      }
      const newCode = `#REC-2026-0${12 + tickets.length}`;
      const newTicket = {
        id: newCode,
        client: 'Usuario Demo (Tú)',
        company: selectedCompany,
        category: 'Calidad / Entrega',
        frustration: 'Alta Frustración',
        daysLeft: 15,
        status: 'Registrado',
        step: 1,
        claimType: 'Devolución de dinero',
        amount,
        summary: [summaryText, 'Evidencia y relato estructurados automáticamente por ReclAI.'],
        originalChat: [...draftChat],
        history: [`Reclamo registrado vía chat con IA · Hoy`, `Clasificado automáticamente por IA · Hoy`]
      };
      tickets.unshift(newTicket);
      saveTickets();
      appModal.classList.add('hidden');
      showToast(`✔ Reclamo ${newCode} registrado. Ya puedes verlo en "Mis Reclamos" y en el Portal Empresa.`);
      document.querySelector('[data-b2c-view="mis-reclamos"]').click();
    });
  });

  // Empresa no registrada (HU-11)
  document.getElementById('openUnregisteredModal').addEventListener('click', () => {
    openModal('Reclamo a Empresa No Registrada', `
      <form id="unregisteredForm" style="display:flex; flex-direction:column; gap:0.75rem;">
        <div>
          <label for="unregName"><strong>Nombre comercial de la empresa *</strong></label>
          <input type="text" id="unregName" required style="width:100%; min-height:44px; padding:0.5rem; border:1px solid var(--border); border-radius:8px;" placeholder="Ej. Boutique Doña Martha">
        </div>
        <div>
          <label for="unregContact"><strong>Correo o teléfono de atención *</strong></label>
          <input type="text" id="unregContact" required style="width:100%; min-height:44px; padding:0.5rem; border:1px solid var(--border); border-radius:8px;" placeholder="contacto@empresa.com">
        </div>
        <button type="submit" class="btn btn-primary">Seleccionar empresa e iniciar chat</button>
      </form>
    `);
    document.getElementById('unregisteredForm').addEventListener('submit', (e) => {
      e.preventDefault();
      selectedCompany = `${document.getElementById('unregName').value.trim()} (No afiliada)`;
      document.getElementById('selectedCompanyLabel').textContent = `Empresa: ${selectedCompany}`;
      appModal.classList.add('hidden');
      switchPortal('b2c');
      document.getElementById('workspace-demo').scrollIntoView({ behavior: 'smooth' });
      showToast('Empresa agregada al borrador');
    });
  });

  // 6. Renderizado de Mis Reclamos & Timeline (HU-25, HU-28, HU-36)
  function renderB2CTickets(filter = '') {
    const featured = tickets[0];
    const steps = ['Registrado', 'En Evaluación', 'Dictamen Emitido', 'Finalizado'];
    document.getElementById('featuredTimelineCard').innerHTML = `
      <div class="card-top-row">
        <strong>Seguimiento del caso destacado ${featured.id} — ${featured.company}</strong>
        <span class="meta-tag">${featured.status}</span>
      </div>
      <div class="stepper">
        ${steps.map((label, idx) => {
          const num = idx + 1;
          const cls = num < featured.step ? 'done' : (num === featured.step ? 'current' : '');
          return `<div class="step-node ${cls}"><div class="step-circle">${num < featured.step ? '✓' : num}</div><div><strong>${label}</strong></div></div>`;
        }).join('')}
      </div>
    `;

    const listEl = document.getElementById('b2cTicketList');
    const filtered = tickets.filter(t =>
      t.id.toLowerCase().includes(filter.toLowerCase()) ||
      t.company.toLowerCase().includes(filter.toLowerCase())
    );

    listEl.innerHTML = filtered.map(t => `
      <article class="consumer-ticket-card">
        <div class="card-top-row">
          <div>
            <strong>${t.company}</strong> · <span class="text-teal">${t.id}</span>
          </div>
          <span class="sla-badge ${t.daysLeft <= 3 ? 'sla-critical' : 'sla-safe'}">
            ${t.status === 'Resuelto' ? '✔ Resuelto' : `⏱ ${t.daysLeft} días hábiles restantes`}
          </span>
        </div>
        <p class="text-muted" style="font-size:0.92rem; margin-bottom:0.75rem;">${t.summary[0]}</p>
        <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
          <button type="button" class="btn btn-outline btn-sm" onclick="window.openConstancia('${t.id}')">Descargar Constancia (PDF)</button>
        </div>
      </article>
    `).join('');
  }

  document.getElementById('b2cSearchFilter').addEventListener('input', (e) => renderB2CTickets(e.target.value));

  window.openConstancia = (id) => {
    const t = tickets.find(item => item.id === id);
    if (!t) return;
    openModal(`Constancia Oficial — ${t.id}`, `
      <div class="receipt-preview" style="margin-bottom:1rem;">
        <strong>RECLAI — ACUSE DE RECIBO OFICIAL (LEY N° 29571)</strong>
        <hr>
        <p><strong>Código:</strong> ${t.id}</p>
        <p><strong>Empresa:</strong> ${t.company}</p>
        <p><strong>Reclamante:</strong> ${t.client}</p>
        <p><strong>Pretensión:</strong> ${t.claimType} (${t.amount})</p>
        <p><strong>Estado actual:</strong> ${t.status}</p>
        <p><strong>Resumen:</strong> ${t.summary.join(' ')}</p>
      </div>
      <button type="button" class="btn btn-primary full-width" onclick="window.print()">🖨 Imprimir / Guardar como PDF</button>
    `);
  };

  // 7. Bandeja B2B Semaforizada (Mockup 4 - HU-37, HU-41)
  function getSlaBadge(ticket) {
    if (ticket.status === 'Resuelto') {
      return '<span class="sla-badge sla-safe">✔ Caso Cerrado</span>';
    }
    if (ticket.daysLeft <= 3) {
      return `<span class="sla-badge sla-critical">⚠ ${ticket.daysLeft} Días restantes</span>`;
    }
    if (ticket.daysLeft <= 7) {
      return `<span class="sla-badge sla-warning">⏳ ${ticket.daysLeft} Días restantes</span>`;
    }
    return `<span class="sla-badge sla-safe">✔ ${ticket.daysLeft} Días restantes</span>`;
  }

  function renderB2BInbox() {
    const openTickets = tickets.filter(t => t.status !== 'Resuelto');
    document.getElementById('kpiCritical').textContent = openTickets.filter(t => t.daysLeft <= 3).length;
    document.getElementById('kpiWarning').textContent = openTickets.filter(t => t.daysLeft >= 4 && t.daysLeft <= 7).length;
    document.getElementById('kpiSafe').textContent = openTickets.filter(t => t.daysLeft >= 8).length;
    document.getElementById('kpiTotal').textContent = openTickets.length;

    const search = document.getElementById('b2bSearchInput').value.toLowerCase();
    const risk = document.getElementById('b2bRiskFilter').value;

    const filtered = tickets.filter(t => {
      const matchText = t.id.toLowerCase().includes(search) || t.client.toLowerCase().includes(search);
      if (!matchText) return false;
      if (risk === 'critical') return t.daysLeft <= 3 && t.status !== 'Resuelto';
      if (risk === 'warning') return t.daysLeft >= 4 && t.daysLeft <= 7 && t.status !== 'Resuelto';
      if (risk === 'safe') return t.daysLeft >= 8 && t.status !== 'Resuelto';
      return true;
    });

    const tbody = document.getElementById('b2bTableBody');
    tbody.innerHTML = filtered.map(t => `
      <tr>
        <td><strong>${t.id}</strong></td>
        <td>${t.client}</td>
        <td>${t.category}</td>
        <td><span class="sla-badge ${t.frustration.includes('Alta') ? 'sla-critical' : 'sla-warning'}">${t.frustration}</span></td>
        <td>${getSlaBadge(t)}</td>
        <td>${t.status}</td>
        <td><button type="button" class="btn btn-sm btn-outline" onclick="window.openB2BDetail('${t.id}')">Gestionar →</button></td>
      </tr>
    `).join('');
  }

  document.getElementById('b2bSearchInput').addEventListener('input', renderB2BInbox);
  document.getElementById('b2bRiskFilter').addEventListener('change', renderB2BInbox);

  // 8. Ficha B2B 3 Columnas & Generador de Respuesta IA (Mockup 5 - HU-38, HU-39, HU-40)
  function buildDraft(ticket, tone) {
    if (tone === 'formal') {
      return `Estimado(a) ${ticket.client}:\n\nPor medio de la presente acusamos recibo de su reclamo ${ticket.id} referente a ${ticket.category}. Tras evaluar las evidencias adjuntas, procedemos a atender su solicitud de ${ticket.claimType.toLowerCase()} por el importe de ${ticket.amount} dentro del plazo establecido.\n\nAtentamente,\nÁrea de Atención al Cliente - ${ticket.company}`;
    }
    if (tone === 'legal') {
      return `Señor(a) ${ticket.client}:\n\nEn cumplimiento de lo dispuesto en el Código de Protección y Defensa del Consumidor (Ley N° 29571) y dentro del plazo legal de 15 días hábiles, damos respuesta oficial al expediente ${ticket.id}. Se declara FUNDADA su pretensión (${ticket.claimType} - ${ticket.amount}), dejando constancia de cierre conforme a normativa INDECOPI.\n\nAtentamente,\nCumplimiento Normativo - ${ticket.company}`;
    }
    return `Estimado(a) ${ticket.client}:\n\nLamentamos sinceramente el inconveniente ocurrido con tu caso (${ticket.id}). Entendemos perfectamente la molestia que esto te ha causado.\n\nHemos revisado tu evidencia y aprobamos de inmediato tu solicitud de ${ticket.claimType.toLowerCase()} por ${ticket.amount}, el cual se hará efectivo en un plazo máximo de 48 horas.\n\nGracias por tu paciencia,\nEquipo de Atención al Cliente - ${ticket.company}`;
  }

  window.openB2BDetail = (id) => {
    activeTicketId = id;
    const t = tickets.find(item => item.id === id);
    if (!t) return;

    document.getElementById('b2bInboxView').classList.add('hidden');
    document.getElementById('b2bDetailView').classList.remove('hidden');

    document.getElementById('detailTicketTitle').textContent = `Reclamo ${t.id}`;
    document.getElementById('detailTicketMeta').textContent = `${t.client} · Empresa: ${t.company}`;
    document.getElementById('detailTopBadges').innerHTML = `${getSlaBadge(t)} <span class="meta-tag">${t.status}</span>`;

    document.getElementById('detailSummaryList').innerHTML = t.summary.map(s => `<li>${s}</li>`).join('');
    document.getElementById('detailClaimType').textContent = t.claimType;
    document.getElementById('detailAmount').textContent = t.amount;
    document.getElementById('detailCategory').textContent = t.category;
    document.getElementById('detailSentimentBadge').innerHTML = `<span class="sla-badge ${t.frustration.includes('Alta') ? 'sla-critical' : 'sla-warning'}">${t.frustration}</span>`;

    document.getElementById('receiptStore').textContent = t.company.toUpperCase();
    document.getElementById('receiptTotal').textContent = t.amount;
    document.getElementById('detailHistoryList').innerHTML = t.history.map(h => `<li>${h}</li>`).join('');

    const tone = document.getElementById('responseToneSelect').value;
    document.getElementById('aiDraftTextarea').value = buildDraft(t, tone);
  };

  document.getElementById('backToInboxBtn').addEventListener('click', () => {
    document.getElementById('b2bDetailView').classList.add('hidden');
    document.getElementById('b2bInboxView').classList.remove('hidden');
    renderB2BInbox();
  });

  document.getElementById('responseToneSelect').addEventListener('change', (e) => {
    const t = tickets.find(item => item.id === activeTicketId);
    if (t) document.getElementById('aiDraftTextarea').value = buildDraft(t, e.target.value);
  });

  document.getElementById('regenerateDraftBtn').addEventListener('click', () => {
    const t = tickets.find(item => item.id === activeTicketId);
    const tone = document.getElementById('responseToneSelect').value;
    if (t) {
      document.getElementById('aiDraftTextarea').value = buildDraft(t, tone);
      showToast('✦ Borrador regenerado por IA');
    }
  });

  document.getElementById('viewOriginalChatBtn').addEventListener('click', () => {
    const t = tickets.find(item => item.id === activeTicketId);
    if (!t) return;
    openModal(`Chat Original — ${t.id}`, `
      <div style="display:flex; flex-direction:column; gap:0.65rem;">
        ${t.originalChat.map(m => `<div class="sub-card"><strong>${m.sender === 'bot' ? 'ReclAI' : t.client} (${m.time}):</strong><p>${m.text}</p></div>`).join('')}
      </div>
    `);
  });

  document.getElementById('sendOfficialResponseBtn').addEventListener('click', () => {
    const t = tickets.find(item => item.id === activeTicketId);
    if (!t) return;
    t.status = 'Resuelto';
    t.step = 4;
    t.history.push('Respuesta oficial enviada y caso cerrado · Hoy');
    saveTickets();
    showToast(`✔ Respuesta oficial enviada para ${t.id}. SLA cerrado.`);
    document.getElementById('backToInboxBtn').click();
  });

  // 9. Consulta Rápida Pública (HU-33)
  document.getElementById('publicTrackingForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = document.getElementById('publicTicketInput').value.trim().toUpperCase();
    const found = tickets.find(t => t.id.toUpperCase() === code);
    const resultEl = document.getElementById('publicTrackingResult');

    if (!found) {
      resultEl.innerHTML = `<div class="sla-badge sla-critical">⚠ No se encontró ningún reclamo asociado al código "${code}".</div>`;
      return;
    }

    resultEl.innerHTML = `
      <div class="sub-card">
        <div class="card-top-row">
          <strong>${found.id} — ${found.company}</strong>
          ${getSlaBadge(found)}
        </div>
        <p><strong>Estado actual:</strong> ${found.status} (Paso ${found.step} de 4)</p>
        <small class="text-muted">Por privacidad (Ley de Protección de Datos), los datos personales permanecen ocultos en la consulta pública.</small>
      </div>
    `;
  });

  // Inicialización
  renderCompanySearch('');
  renderChat();
  renderB2CTickets();
  renderB2BInbox();
})();