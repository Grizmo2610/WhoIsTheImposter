/* ========================================= GAME STATE ========================================= */
const PALETTE = ['#d4af6a', '#e0654f', '#4f8b8b', '#e8cf9c', '#f2a48f', '#8b93a6', '#c98a4b'];

const App = {
  numPlayers: 5,
  numImposters: 1,
  imposterMode: 'aware',   // 'aware' = biết mình là ai, nhận gợi ý | 'hidden' = ẩn danh, nhận từ gần giống
  multiRound: true,
  timerEnabled: false,
  timerMinutes: 3,
  players: [],
  words: [],
  currentEntry: null,      // { real, related, hint }
  currentPlayerIndex: 0,
  votedIndex: null,
  pendingGameOver: false,
  pendingWinner: null,
  winner: null,
  timerId: null,
  timerRemaining: 0,
  confettiRunning: false,

  /* ----- Words / CSV ----- */
  async loadWordBank() {
    const tryFetch = async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('No CSV');
      return await res.text();
    };

    let raw = '';
    try {
      raw = await tryFetch('words.csv');
    } catch (e) {
      try {
        raw = await tryFetch('./words.csv');
      } catch (e2) {
        raw = '';
      }
    }

    if (raw.trim().length) {
      this.words = this.parseCSV(raw);
    }
    if (!this.words.length) {
      this.words = this.getDefaultWords();
    }
  },

  parseCSV(text) {
    const out = [];
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    lines.forEach((line, idx) => {
      if (idx === 0) return; // dòng đầu luôn là tiêu đề cột: tu_that,tu_lien_quan,goi_y
      const parts = line.split(',').map(s => s.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        out.push({
          real: parts[0],
          related: parts[1],
          hint: parts[2] || 'Từ này có liên quan gần với chủ đề của từ thật.'
        });
      }
    });
    return out;
  },

  getDefaultWords() {
    const pairs = [
      ["Chó","Mèo"],["Biển","Hồ"],["Sách","Vở"],["Cà phê","Trà"],
      ["Núi","Đồi"],["Xe máy","Xe đạp"],["Máy bay","Tàu thủy"],
      ["Bóng đá","Bóng rổ"],["Pizza","Hamburger"],["Điện thoại","Máy tính bảng"],
      ["Mưa","Tuyết"],["Bút chì","Bút mực"],["Sushi","Phở"],["Tivi","Máy chiếu"],
      ["Ghế","Sofa"],["Bàn ăn","Bàn học"],["Tủ lạnh","Máy giặt"],
      ["Cửa sổ","Cửa ra vào"],["Đèn ngủ","Đèn bàn"],["Khăn tắm","Khăn mặt"],
      ["Giày","Dép"],["Túi xách","Balo"],["Chuột","Bàn phím"],["Loa","Tai nghe"],
      ["Bánh mì","Bánh ngọt"],["Sữa","Nước cam"],["Trứng gà","Trứng vịt"],
      ["Cà chua","Cà rốt"],["Táo","Cam"],["Dưa hấu","Dưa lưới"],
      ["Gà","Vịt"],["Cá","Tôm"],["Heo","Bò"],["Gạo","Mì"],["Dao","Kéo"],
      ["Chảo","Nồi"],["Bát","Đĩa"],["Thìa","Dĩa"],["Kem","Bánh flan"],
      ["Ô tô","Xe buýt"],["Cầu thang","Thang máy"],
      ["Áo thun","Sơ mi"],["Quạt","Máy lạnh"],["Mặt trời","Mặt trăng"],
      ["Sông","Suối"],["Rừng","Vườn"],["Bưu điện","Ngân hàng"],
      ["Bệnh viện","Phòng khám"],["Thư viện","Hiệu sách"],
      ["Công viên","Sở thú"],["Nhà hàng","Quán ăn"]
    ];
    return pairs.map(([real, related]) => ({
      real, related,
      hint: 'Từ này có liên quan gần với chủ đề của từ thật.'
    }));
  },

  /* ----- Setup ----- */
  stepPlayers(delta) {
    let n = this.numPlayers + delta;
    if (n < 3) n = 3;
    if (n > 12) n = 12;
    this.numPlayers = n;
    this.validateConfig();
    this.renderSetup();
  },
  stepImposters(delta) {
    let n = this.numImposters + delta;
    if (n < 1) n = 1;
    const maxImp = Math.max(1, Math.ceil(this.numPlayers / 2) - 1);
    if (n > maxImp) n = maxImp;
    this.numImposters = n;
    this.renderSetup();
  },
  setImposterMode(mode) {
    this.imposterMode = mode;
    this.renderSetup();
  },
  toggleMultiRound() {
    this.multiRound = !this.multiRound;
    this.renderSetup();
  },
  toggleTimer() {
    this.timerEnabled = !this.timerEnabled;
    this.renderSetup();
  },
  validateConfig() {
    const maxImp = Math.max(1, Math.ceil(this.numPlayers / 2) - 1);
    if (this.numImposters > maxImp) this.numImposters = maxImp;
  },
  renderSetup() {
    document.getElementById('disp-players').textContent = this.numPlayers;
    document.getElementById('disp-imposters').textContent = this.numImposters;

    document.querySelectorAll('.segmented-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === this.imposterMode);
    });

    const mr = document.getElementById('badge-multiround');
    mr.classList.toggle('off', !this.multiRound);
    mr.textContent = this.multiRound ? 'Bật' : 'Tắt';

    const tm = document.getElementById('badge-timer');
    tm.classList.toggle('off', !this.timerEnabled);
    tm.textContent = this.timerEnabled ? 'Bật' : 'Tắt';
    document.getElementById('timerInputWrap').classList.toggle('show', this.timerEnabled);
  },

  /* ----- Names ----- */
  goNames() {
    this.timerMinutes = parseInt(document.getElementById('timerMinutes').value) || 3;
    this.validateConfig();
    this.players = [];
    for (let i = 0; i < this.numPlayers; i++) {
      this.players.push({
        name: `Người chơi ${i+1}`,
        color: PALETTE[i % PALETTE.length],
        role: 'civilian',
        word: '',
        hint: '',
        eliminated: false
      });
    }
    this.renderNames();
    this.showScreen('screen-names');
  },
  renderNames() {
    const container = document.getElementById('name-list');
    container.innerHTML = '';
    this.players.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'name-row';
      row.innerHTML = `
        <div class="name-avatar" style="background:${p.color}">${this.getInitials(p.name)}</div>
        <input type="text" value="${p.name}" placeholder="Tên người chơi ${i+1}" data-index="${i}" oninput="App.updateName(this)" style="flex:1;">
      `;
      container.appendChild(row);
    });
  },
  getInitials(name) {
    const parts = name.trim().split(/\s+/);
    if (!parts[0]) return '?';
    if (parts.length > 1) return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
    return parts[0].slice(0,2).toUpperCase();
  },
  updateName(input) {
    const idx = parseInt(input.dataset.index);
    this.players[idx].name = input.value || `Người chơi ${idx+1}`;
    const avatar = input.parentElement.querySelector('.name-avatar');
    if (avatar) avatar.textContent = this.getInitials(this.players[idx].name);
  },
  shufflePlayers() {
    for (let i = this.players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.players[i], this.players[j]] = [this.players[j], this.players[i]];
    }
    this.players.forEach((p,i) => p.color = PALETTE[i % PALETTE.length]);
    this.renderNames();
  },

  /* ----- Assign roles & words ----- */
  assignGame() {
    if (!this.words.length) this.words = this.getDefaultWords();
    this.currentEntry = this.words[Math.floor(Math.random() * this.words.length)];

    const indices = this.players.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const specialRoles = [];
    for (let i=0; i<this.numImposters; i++) specialRoles.push('imposter');
    while (specialRoles.length < this.numPlayers) specialRoles.push('civilian');

    indices.forEach((origIdx, pos) => {
      const role = specialRoles[pos];
      const p = this.players[origIdx];
      p.role = role;
      p.eliminated = false;
      if (role === 'imposter') {
        if (this.imposterMode === 'hidden') {
          p.word = this.currentEntry.related;
          p.hint = '';
        } else {
          p.word = null;
          p.hint = this.currentEntry.hint;
        }
      } else {
        p.word = this.currentEntry.real;
        p.hint = '';
      }
    });

    this.currentPlayerIndex = 0;
    this.votedIndex = null;
  },

  /* ----- Handover & Reveal ----- */
  goHandover() {
    this.players.forEach((p, i) => {
      if (!p.name.trim()) p.name = `Người chơi ${i+1}`;
    });
    this.assignGame();
    this.showHandover();
    this.showScreen('screen-handover');
  },
  showHandover() {
    const p = this.players[this.currentPlayerIndex];
    const pct = (this.currentPlayerIndex / this.numPlayers) * 100;
    document.getElementById('progressFill').style.width = pct + '%';

    document.getElementById('ho-avatar').style.background = p.color;
    document.getElementById('ho-avatar').textContent = this.getInitials(p.name);
    document.getElementById('ho-name').textContent = p.name;
    document.getElementById('ho-btn-name').textContent = p.name;
  },
  showReveal() {
    const p = this.players[this.currentPlayerIndex];
    const wordEl = document.getElementById('secret-word');
    const hintEl = document.getElementById('secret-hint');

    if (p.role === 'imposter' && this.imposterMode === 'aware') {
      wordEl.textContent = 'KẺ GIẤU MẶT';
      wordEl.style.color = 'var(--coral-soft)';
      wordEl.style.fontSize = '2rem';
      hintEl.innerHTML = `Gợi ý cho bạn: <b style="color:var(--paper)">${p.hint}</b>`;
    } else {
      wordEl.textContent = p.word;
      wordEl.style.color = 'var(--paper)';
      wordEl.style.fontSize = '';
      hintEl.textContent = 'Hãy ghi nhớ từ này';
    }

    document.getElementById('anti-cheat-overlay').style.display = 'none';
    this.showScreen('screen-reveal');
  },
  finishReveal() {
    this.currentPlayerIndex++;
    if (this.currentPlayerIndex >= this.numPlayers) {
      if (this.timerEnabled) {
        this.startDiscussion();
      } else {
        this.goVote();
      }
    } else {
      this.showHandover();
      this.showScreen('screen-handover');
    }
  },

  /* ----- Discussion ----- */
  startDiscussion() {
    this.showScreen('screen-discuss');
    const chips = document.getElementById('discuss-chips');
    chips.innerHTML = this.players.filter(p => !p.eliminated).map(p =>
      `<div class="chip" style="border-color:${p.color}55;">${p.name}</div>`
    ).join('');
    document.getElementById('discuss-sub').textContent = `Thảo luận trong ${this.timerMinutes} phút`;

    const wrap = document.getElementById('timerWrap');
    wrap.style.display = 'block';
    this.timerRemaining = this.timerMinutes * 60;
    const total = this.timerRemaining;
    const bar = document.getElementById('timer-bar');
    const text = document.getElementById('timer-text');
    const circumference = 2 * Math.PI * 100;
    bar.style.strokeDasharray = circumference;
    bar.style.strokeDashoffset = 0;

    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      this.timerRemaining--;
      const m = String(Math.floor(this.timerRemaining/60)).padStart(2,'0');
      const s = String(this.timerRemaining%60).padStart(2,'0');
      text.textContent = `${m}:${s}`;
      const offset = circumference * (1 - this.timerRemaining/total);
      bar.style.strokeDashoffset = offset;
      if (this.timerRemaining <= 0) {
        clearInterval(this.timerId);
        text.textContent = "Hết giờ";
      }
    }, 1000);
  },

  /* ----- Voting ----- */
  goVote() {
    if (this.timerId) clearInterval(this.timerId);
    document.getElementById('btn-confirm-vote').style.display = 'none';
    this.votedIndex = null;
    this.renderVoteGrid();
    this.showScreen('screen-vote');
  },
  renderVoteGrid() {
    const grid = document.getElementById('vote-grid');
    grid.innerHTML = '';
    this.players.forEach((p, i) => {
      if (p.eliminated) return;
      const card = document.createElement('div');
      card.className = 'vote-card';
      card.onclick = () => this.selectVote(i);
      card.innerHTML = `
        <div class="vote-avatar" style="background:${p.color}">${this.getInitials(p.name)}</div>
        <div class="vote-name">${p.name}</div>
      `;
      card.dataset.index = i;
      grid.appendChild(card);
    });
  },
  selectVote(index) {
    if (this.votedIndex === index) {
      this.votedIndex = null;
      document.getElementById('btn-confirm-vote').style.display = 'none';
    } else {
      this.votedIndex = index;
      document.getElementById('confirm-name').textContent = this.players[index].name;
      document.getElementById('btn-confirm-vote').style.display = 'block';
    }
    document.querySelectorAll('.vote-card').forEach(c => {
      c.classList.toggle('selected', parseInt(c.dataset.index) === this.votedIndex);
    });
  },
  openConfirmVote() {
    if (this.votedIndex == null) return;
    document.getElementById('modal-name').textContent = this.players[this.votedIndex].name;
    document.getElementById('modal-confirm').classList.add('active');
  },
  closeModal() {
    document.getElementById('modal-confirm').classList.remove('active');
  },
  openRules() {
    document.getElementById('modal-rules').classList.add('active');
  },
  closeRules() {
    document.getElementById('modal-rules').classList.remove('active');
  },
  doEliminate() {
    this.closeModal();
    const idx = this.votedIndex;
    if (idx == null) return;
    const p = this.players[idx];
    p.eliminated = true;

    const wasImposter = p.role === 'imposter';

    // Xác định trạng thái ván đấu sau khi loại người này
    const activeImposters = this.players.filter(pl => pl.role === 'imposter' && !pl.eliminated).length;
    const activeCivilians = this.players.filter(pl => pl.role === 'civilian' && !pl.eliminated).length;

    let gameOver, winner;
    if (!this.multiRound) {
      gameOver = true;
      winner = wasImposter ? 'civilian' : 'imposter';
    } else if (activeImposters === 0) {
      gameOver = true; winner = 'civilian';
    } else if (activeImposters >= activeCivilians) {
      gameOver = true; winner = 'imposter';
    } else {
      gameOver = false; winner = null;
    }
    this.pendingGameOver = gameOver;
    this.pendingWinner = winner;

    // Hiển thị màn lộ diện
    document.getElementById('elim-avatar').style.background = p.color;
    document.getElementById('elim-avatar').textContent = this.getInitials(p.name);
    document.getElementById('elim-name').textContent = p.name;
    document.getElementById('elim-word').textContent = p.role === 'imposter' && this.imposterMode === 'aware'
      ? (p.hint || '—') : (p.word ?? '—');
    const roleEl = document.getElementById('elim-role');
    roleEl.textContent = p.role === 'civilian' ? 'Dân thường' : 'Kẻ giấu mặt';
    roleEl.className = 'badge-role ' + (p.role === 'civilian' ? 'badge-civilian' : 'badge-imposter');

    const verdict = document.getElementById('elim-verdict');
    if (wasImposter) {
      verdict.textContent = '✅ Chính xác! Bạn đã tìm ra Kẻ giấu mặt.';
      verdict.className = 'elim-verdict correct';
    } else {
      verdict.textContent = '❌ Đoán sai rồi! Đây là Dân thường.';
      verdict.className = 'elim-verdict wrong';
    }

    const btn = document.getElementById('btn-elim-next');
    btn.textContent = gameOver ? 'Xem kết quả cuối cùng' : 'Tiếp tục vòng tiếp theo';
    btn.onclick = gameOver ? () => this.goResults() : () => this.goNextRound();

    this.showScreen('screen-elimination');
  },

  goNextRound() {
    if (this.timerEnabled) {
      this.startDiscussion();
    } else {
      this.goVote();
    }
  },

  /* ----- Results ----- */
  goResults() {
    this.showScreen('screen-result');
    this.winner = this.pendingWinner;
    const title = document.getElementById('result-title');
    const banner = document.getElementById('result-banner');

    if (this.winner === 'civilian') {
      banner.classList.remove('alt');
      title.textContent = 'Dân thường thắng! 🎉';
    } else {
      banner.classList.add('alt');
      title.textContent = 'Kẻ giấu mặt thắng! 😈';
    }

    const list = document.getElementById('result-list');
    list.innerHTML = this.players.map(p => {
      const roleLabel = p.role === 'civilian' ? 'Dân' : 'Giấu mặt';
      const roleClass = p.role === 'civilian' ? 'badge-civilian' : 'badge-imposter';
      const wordDisplay = (p.role === 'imposter' && this.imposterMode === 'aware') ? (p.hint || '—') : (p.word ?? '—');
      const elimMark = p.eliminated ? ' <span style="color:var(--gold)">(đã bị loại)</span>' : ' <span style="color:var(--teal)">(còn lại)</span>';
      return `
        <div class="result-item">
          <div class="result-meta">
            <div class="result-avatar" style="background:${p.color}">${this.getInitials(p.name)}</div>
            <div>
              <div style="font-weight:700;">${p.name}${elimMark}</div>
              <div style="font-size:0.8rem; color:var(--ghost); margin-top:2px;">${wordDisplay}</div>
            </div>
          </div>
          <div class="badge-role ${roleClass}">${roleLabel}</div>
        </div>
      `;
    }).join('');

    this.startConfetti();
  },

  /* ----- Replay ----- */
  replayKeepConfig() {
    this.confettiRunning = false;
    this.players.forEach((p, i) => { p.name = `Người chơi ${i+1}`; p.eliminated = false; });
    this.currentPlayerIndex = 0;
    this.votedIndex = null;
    this.renderNames();
    this.showScreen('screen-names');
  },
  replayNewGame() {
    this.confettiRunning = false;
    this.resetToSetup();
    this.showScreen('screen-setup');
  },
  resetToSetup() {
    this.numPlayers = 5;
    this.numImposters = 1;
    this.imposterMode = 'aware';
    this.multiRound = true;
    this.timerEnabled = false;
    this.timerMinutes = 3;
    this.players = [];
    this.currentPlayerIndex = 0;
    this.votedIndex = null;
    this.renderSetup();
  },

  /* ----- Utilities ----- */
  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  },

  /* ----- Confetti ----- */
  startConfetti() {
    this.confettiRunning = true;
    const canvas = document.getElementById('confetti');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ['#d4af6a', '#e0654f', '#4f8b8b', '#e8cf9c', '#f2a48f'];
    const particles = [];
    const create = () => ({
      x: Math.random()*canvas.width,
      y: -20,
      vx: (Math.random()-0.5)*5,
      vy: Math.random()*3 + 2,
      size: Math.random()*7 + 4,
      color: colors[Math.floor(Math.random()*colors.length)],
      rot: Math.random()*360,
      rv: (Math.random()-0.5)*12
    });
    const draw = () => {
      if (!this.confettiRunning) {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        return;
      }
      ctx.clearRect(0,0,canvas.width,canvas.height);
      if (particles.length < 180) particles.push(create());
      particles.forEach((p,i) => {
        p.x += p.vx; p.y += p.vy; p.rot += p.rv;
        ctx.save();
        ctx.translate(p.x,p.y);
        ctx.rotate(p.rot*Math.PI/180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        ctx.restore();
        if (p.y > canvas.height) { particles.splice(i,1); }
      });
      requestAnimationFrame(draw);
    };
    draw();
    setTimeout(() => { this.confettiRunning = false; }, 3500);
  }
};

/* ===== Đóng modal khi bấm ra ngoài ===== */
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('active');
  });
});

/* ===== Anti-cheat: Ẩn từ khi rời tab ===== */
document.addEventListener('visibilitychange', () => {
  const overlay = document.getElementById('anti-cheat-overlay');
  const reveal = document.getElementById('screen-reveal');
  if (document.hidden && reveal && reveal.classList.contains('active')) {
    overlay.style.display = 'flex';
  }
});

/* ===== Khởi động ===== */
App.loadWordBank().then(() => {
  App.renderSetup();
});
window.addEventListener('resize', () => {
  const cvs = document.getElementById('confetti');
  if (cvs) { cvs.width = window.innerWidth; cvs.height = window.innerHeight; }
});