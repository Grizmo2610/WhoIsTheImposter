/* ========================================================
   Game state — giờ chỉ giữ những gì cần cho UI pass-and-play
   trên 1 thiết bị. Vai trò/từ/thắng-thua do BACKEND quyết định
   (xem api.js) — client không tự tính nữa.
   ======================================================== */
const PALETTE = ['#d4af6a', '#e0654f', '#4f8b8b', '#e8cf9c', '#f2a48f', '#8b93a6', '#c98a4b'];

const App = {
  numPlayers: 5,
  numImposters: 1,
  imposterMode: 'aware',
  multiRound: true,
  timerEnabled: false,
  timerMinutes: 3,

  roomId: null,
  hostToken: null,
  players: [],           // { name, color, playerId, playerToken, eliminated }
  currentPlayerIndex: 0,
  votedIndex: null,
  pendingGameOver: false,
  pendingWinner: null,
  timerId: null,
  timerRemaining: 0,
  confettiRunning: false,

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
        playerId: null,
        playerToken: null,
        eliminated: false,
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

  /* ----- Loading overlay dùng chung khi chờ API ----- */
  setBusy(isBusy, label) {
    let el = document.getElementById('api-busy');
    if (!el) {
      el = document.createElement('div');
      el.id = 'api-busy';
      el.style.cssText = 'position:fixed;inset:0;background:rgba(6,9,15,0.7);display:none;align-items:center;justify-content:center;z-index:500;color:#f2e9d8;font-weight:700;';
      document.body.appendChild(el);
    }
    el.textContent = label || 'Đang xử lý...';
    el.style.display = isBusy ? 'flex' : 'none';
  },
  showApiError(err) {
    console.error(err);
    alert(err.message || 'Có lỗi xảy ra khi kết nối server.');
  },

  /* ----- Tạo phòng trên server + gán vai trò ----- */
  async goHandover() {
    this.players.forEach((p, i) => {
      if (!p.name.trim()) p.name = `Người chơi ${i+1}`;
    });

    this.setBusy(true, 'Đang tạo phòng...');
    try {
      // 1) Tạo phòng (nếu chưa có, hoặc đang ở phòng cũ đã dùng thì tạo phòng mới)
      if (!this.roomId) {
        const room = await api.createRoom();
        this.roomId = room.room_id;
        this.hostToken = room.host_token;
      }

      // 2) Từng người tham gia phòng -> nhận playerId/playerToken riêng
      this.setBusy(true, 'Đang thêm người chơi...');
      for (const p of this.players) {
        const joined = await api.joinRoom(this.roomId, p.name);
        p.playerId = joined.player_id;
        p.playerToken = joined.player_token;
        p.eliminated = false;
      }

      // 3) Áp cấu hình do host chọn
      this.setBusy(true, 'Đang áp cấu hình...');
      await api.updateConfig(this.roomId, this.hostToken, {
        num_imposters: this.numImposters,
        imposter_mode: this.imposterMode,
        multi_round: this.multiRound,
        timer_enabled: this.timerEnabled,
        timer_minutes: this.timerMinutes,
      });

      // 4) Server random từ + gán vai trò cho tất cả người chơi
      this.setBusy(true, 'Đang chia vai trò...');
      await api.startGame(this.roomId, this.hostToken);
    } catch (e) {
      this.setBusy(false);
      this.showApiError(e);
      return;
    }
    this.setBusy(false);

    this.currentPlayerIndex = 0;
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

  /* ----- Xem từ bí mật: lấy từ SERVER bằng token riêng của người này ----- */
  async showReveal() {
    const p = this.players[this.currentPlayerIndex];
    const wordEl = document.getElementById('secret-word');
    const hintEl = document.getElementById('secret-hint');

    this.setBusy(true, 'Đang tải từ của bạn...');
    let secret;
    try {
      secret = await api.getSecret(this.roomId, p.playerId, p.playerToken);
    } catch (e) {
      this.setBusy(false);
      this.showApiError(e);
      return;
    }
    this.setBusy(false);

    if (secret.role === 'imposter' && secret.is_imposter_aware) {
      wordEl.textContent = 'KẺ GIẤU MẶT';
      wordEl.style.color = 'var(--coral-soft)';
      wordEl.style.fontSize = '2rem';
      hintEl.innerHTML = `Gợi ý cho bạn: <b style="color:var(--paper)">${secret.hint}</b>`;
    } else {
      wordEl.textContent = secret.word;
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

  /* ----- Voting (chọn tại chỗ trên 1 máy, không cần từng người bấm phiếu riêng) ----- */
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

  /* ----- Loại người chơi: SERVER quyết định đúng/sai + thắng/thua ----- */
  async doEliminate() {
    this.closeModal();
    const idx = this.votedIndex;
    if (idx == null) return;
    const p = this.players[idx];

    this.setBusy(true, 'Đang xử lý kết quả...');
    let result;
    try {
      result = await api.eliminate(this.roomId, this.hostToken, p.playerId);
    } catch (e) {
      this.setBusy(false);
      this.showApiError(e);
      return;
    }
    this.setBusy(false);

    p.eliminated = true;
    this.pendingGameOver = result.game_over;
    this.pendingWinner = result.winner;

    document.getElementById('elim-avatar').style.background = p.color;
    document.getElementById('elim-avatar').textContent = this.getInitials(p.name);
    document.getElementById('elim-name').textContent = p.name;
    document.getElementById('elim-word').textContent = result.revealed_word;
    const roleEl = document.getElementById('elim-role');
    roleEl.textContent = result.role_label;
    roleEl.className = 'badge-role ' + (result.was_imposter ? 'badge-imposter' : 'badge-civilian');

    const verdict = document.getElementById('elim-verdict');
    if (result.was_imposter) {
      verdict.textContent = '✅ Chính xác! Bạn đã tìm ra Kẻ giấu mặt.';
      verdict.className = 'elim-verdict correct';
    } else {
      verdict.textContent = '❌ Đoán sai rồi! Đây là Dân thường.';
      verdict.className = 'elim-verdict wrong';
    }

    const btn = document.getElementById('btn-elim-next');
    btn.textContent = result.game_over ? 'Xem kết quả cuối cùng' : 'Tiếp tục vòng tiếp theo';
    btn.onclick = result.game_over ? () => this.goResults() : () => this.goNextRound();

    this.showScreen('screen-elimination');
  },

  goNextRound() {
    if (this.timerEnabled) {
      this.startDiscussion();
    } else {
      this.goVote();
    }
  },

  /* ----- Results: lấy đầy đủ vai trò/từ từ server (chỉ cho phép khi đã finished) ----- */
  async goResults() {
    this.setBusy(true, 'Đang tải kết quả...');
    let reveal;
    try {
      reveal = await api.reveal(this.roomId);
    } catch (e) {
      this.setBusy(false);
      this.showApiError(e);
      return;
    }
    this.setBusy(false);
    this.showScreen('screen-result');

    const title = document.getElementById('result-title');
    const banner = document.getElementById('result-banner');
    if (reveal.winner === 'civilian') {
      banner.classList.remove('alt');
      title.textContent = 'Dân thường thắng! 🎉';
    } else {
      banner.classList.add('alt');
      title.textContent = 'Kẻ giấu mặt thắng! 😈';
    }

    const list = document.getElementById('result-list');
    list.innerHTML = reveal.players.map(p => {
      const roleLabel = p.role === 'civilian' ? 'Dân' : 'Giấu mặt';
      const roleClass = p.role === 'civilian' ? 'badge-civilian' : 'badge-imposter';
      const elimMark = p.eliminated
        ? ' <span style="color:var(--gold)">(đã bị loại)</span>'
        : ' <span style="color:var(--teal)">(còn lại)</span>';
      return `
        <div class="result-item">
          <div class="result-meta">
            <div class="result-avatar" style="background:${p.color}">${this.getInitials(p.name)}</div>
            <div>
              <div style="font-weight:700;">${p.name}${elimMark}</div>
              <div style="font-size:0.8rem; color:var(--ghost); margin-top:2px;">${p.revealed_word}</div>
            </div>
          </div>
          <div class="badge-role ${roleClass}">${roleLabel}</div>
        </div>
      `;
    }).join('');

    this.startConfetti();
  },

  /* ----- Replay ----- */
  async replayKeepConfig() {
    this.confettiRunning = false;
    this.setBusy(true, 'Đang chuẩn bị ván mới...');
    try {
      // Giữ config trên server, xoá hết người chơi để nhập tên lại
      await api.reset(this.roomId, this.hostToken, false);
    } catch (e) {
      this.setBusy(false);
      this.showApiError(e);
      return;
    }
    this.setBusy(false);

    this.players.forEach((p, i) => {
      p.name = `Người chơi ${i+1}`;
      p.eliminated = false;
      p.playerId = null;
      p.playerToken = null;
    });
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
    // Bỏ phòng cũ — lần "Bắt đầu" kế tiếp sẽ tạo phòng mới hoàn toàn trên server.
    this.roomId = null;
    this.hostToken = null;
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
App.renderSetup();
window.addEventListener('resize', () => {
  const cvs = document.getElementById('confetti');
  if (cvs) { cvs.width = window.innerWidth; cvs.height = window.innerHeight; }
});