// index.js
document.addEventListener('DOMContentLoaded', function() {
  // Set active nav link based on current page
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-list li a');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.style.fontWeight = '700';
    }
  });

  const toast = document.getElementById('welcome-toast');
  if (!toast) return;

  const showToast = () => {
    toast.hidden = false;
    // trigger CSS transition
    requestAnimationFrame(() => toast.classList.add('show'));
  };

  const hideToast = () => {
    toast.classList.remove('show');
    // wait for transition then hide
    setTimeout(() => { toast.hidden = true; }, 250);
  };

  // show once on load
  showToast();

  // auto-hide after 3 seconds
  const autoHide = setTimeout(hideToast, 3000);

  // close button
  const closeBtn = toast.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      clearTimeout(autoHide);
      hideToast();
    });
  }
});

// Agent widget behavior
document.addEventListener('DOMContentLoaded', function(){
  const agentBtn = document.querySelector('.agent-button');
  const agentPanel = document.querySelector('.agent-panel');
  const agentClose = document.querySelector('.agent-close');
  const agentForm = document.querySelector('.agent-form');
  const agentBody = document.querySelector('.agent-body');
  const agentInput = document.querySelector('.agent-input');
  const agentStyle = document.getElementById('agent-style');
  const agentClear = document.getElementById('agent-clear');

  const STORAGE_KEY = 'barkada_agent_history_v1';

  function loadHistory(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e){ return []; }
  }

  function saveHistory(arr){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }catch(e){}
  }

  function renderHistory(){
    agentBody.innerHTML = '';
    const hist = loadHistory();
    hist.forEach(item => {
      appendMessage(item.text, item.who);
    });
  }

  // wire clear history
  if (agentClear) agentClear.addEventListener('click', function(){
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
  });

  // load existing history on open
  renderHistory();

  if (!agentBtn || !agentPanel) return;

  function togglePanel(open){
    if (open === undefined) open = agentPanel.hasAttribute('hidden');
    if (open) {
      agentPanel.removeAttribute('hidden');
      agentInput && agentInput.focus();
    } else {
      agentPanel.setAttribute('hidden', '');
    }
  }

  agentBtn.addEventListener('click', function(){ togglePanel(true); });
  agentClose && agentClose.addEventListener('click', function(){ togglePanel(false); });

  function appendMessage(text, who){
    const el = document.createElement('div');
    el.className = 'msg ' + (who === 'user' ? 'user' : 'agent');
    if (who === 'agent') {
      // render markdown-like content for agent replies
      el.innerHTML = mdToHtml(escapeHtml(text));
    } else {
      el.textContent = text;
    }
    agentBody.appendChild(el);
    agentBody.scrollTop = agentBody.scrollHeight;

    // persist
    const hist = loadHistory();
    hist.push({ who, text, t: Date.now() });
    // keep last 200 messages
    if (hist.length > 200) hist.splice(0, hist.length - 200);
    saveHistory(hist);
  }

  // simple HTML escape
  function escapeHtml(str){
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // very small markdown-ish renderer: code blocks ``` ``` and inline `code`, links
  function mdToHtml(escaped){
    // code blocks
    let out = escaped.replace(/```([\s\S]*?)```/g, function(m, code){
      return '<pre><code>' + code.replace(/\n$/, '') + '</code></pre>';
    });
    // inline code
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    // links [text](url)
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // paragraphs / line breaks
    out = out.replace(/\n\n+/g, '</p><p>');
    out = '<p>' + out.replace(/\n/g, '<br>') + '</p>';
    return out;
  }

  agentForm && agentForm.addEventListener('submit', function(e){
    e.preventDefault();
    const val = agentInput.value && agentInput.value.trim();
    if (!val) return;
    appendMessage(val, 'user');
    agentInput.value = '';
    // Send the question to the server proxy which calls OpenAI
    // show typing indicator
    const typingEl = document.createElement('div');
    typingEl.className = 'typing';
    typingEl.textContent = 'BaldKids is typing…';
    agentBody.appendChild(typingEl);
    agentBody.scrollTop = agentBody.scrollHeight;

    // Build payload with conversation history so BaldKids keeps context
    const payload = { question: val };
    // include temperature if selected
    if (agentStyle && agentStyle.value) payload.temperature = parseFloat(agentStyle.value);
    // include recent history messages as Chat-style messages
    try {
      const hist = loadHistory() || [];
      // convert stored history to chat messages (last 24 messages before the new user question)
      const recent = hist.slice(-24).map(item => ({ role: item.who === 'user' ? 'user' : 'assistant', content: item.text }));
      payload.messages = recent;
    } catch(e) { console.error('Error building history:', e); }

    fetch('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(async (r) => {
      const data = await r.json();
      // remove typing indicator
      if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
      if (r.ok && data && data.reply) {
        appendMessage(data.reply, 'agent');
      } else {
        appendMessage('Sorry, I could not get an answer right now.', 'agent');
        console.error('Agent error', data);
      }
    }).catch((err) => {
      if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
      appendMessage('Network error while contacting the agent.', 'agent');
      console.error(err);
    });
  });

  // quick replies
  const quicks = ['Tell me about upcoming events', 'Show the gallery highlights', 'Plan a meetup for 5 people', 'What makes our barkada special?', 'Help with event planning', 'Share a fun fact about us'];
  const quickWrap = document.createElement('div');
  quickWrap.style.display = 'flex'; quickWrap.style.gap = '8px'; quickWrap.style.flexWrap = 'wrap'; quickWrap.style.padding = '8px 12px';
  quicks.forEach(q => {
    const b = document.createElement('button');
    b.className = 'agent-quick'; b.type = 'button'; b.textContent = q;
    b.style.background = '#fff'; b.style.border = '1px solid #eee'; b.style.padding = '6px 8px'; b.style.borderRadius = '8px';
    b.addEventListener('click', ()=>{
      agentInput.value = q; agentForm.dispatchEvent(new Event('submit', { cancelable: true }));
    });
    quickWrap.appendChild(b);
  });
  agentBody.parentNode.insertBefore(quickWrap, agentBody.nextSibling);
});
