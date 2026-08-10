/* ========================================================
   Game state — chạy 100% local, không cần backend.
   LocalEngine (api.js) lo việc random từ và gán vai trò.
   ======================================================== */
const PALETTE = ['#d4af6a', '#e0654f', '#4f8b8b', '#e8cf9c', '#f2a48f', '#8b93a6', '#c98a4b'];

const App = {
  numPlayers: 5,
  numImposters: 1,
  imposterMode: 'aware',
  hiddenTopicMode: 'same_topic',
  multiRound: true,
  timerEnabled: false,
  timerMinutes: 3,
  revealRoleMode: true, // Bật: sau khi loại sẽ hiện role (không bao giờ hiện từ giữa ván)

  roomId: null,
  hostToken: null,
  players: [],           // { name, color, playerId, playerToken, eliminated, secret }
  currentPlayerIndex: 0,
  votedIndex: null,
  pendingGameOver: false,
  pendingWinner: null,
  timerId: null,
  timerRemaining: 0,
  confettiRunning: false,
  offlineMode: false,    // true khi đang chạy fallback cục bộ vì backend lỗi
  realWord: null,        // từ thật (dân thường) — cache khi lấy được từ server
  realMeaning: null,

  /* ----- LocalStorage: lưu lại toàn bộ tiến trình để chơi tiếp nếu backend die -----
     An toàn vì đây là game truyền tay 1 thiết bị: tới lúc voting thì mọi người chơi
     đã tự xem xong bí mật của mình trên chính máy này rồi, không lộ thêm gì mới. */
  STORAGE_KEY: 'imposter_game_state_v1',
  saveProgress() {
    if (!this.roomId) return;
    try {
      const snapshot = {
        roomId: this.roomId, hostToken: this.hostToken,
        numPlayers: this.numPlayers, numImposters: this.numImposters,
        imposterMode: this.imposterMode, hiddenTopicMode: this.hiddenTopicMode,
        multiRound: this.multiRound, timerEnabled: this.timerEnabled,
        timerMinutes: this.timerMinutes, revealRoleMode: this.revealRoleMode,
        players: this.players, currentPlayerIndex: this.currentPlayerIndex,
        realWord: this.realWord, realMeaning: this.realMeaning,
        screen: document.querySelector('.screen.active')?.id || 'screen-setup',
        savedAt: Date.now(),
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) { /* localStorage đầy hoặc bị chặn -> bỏ qua, không chặn game */ }
  },
  clearProgress() {
    try { localStorage.removeItem(this.STORAGE_KEY); } catch (e) {}
  },
  loadSavedSnapshot() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  checkResumable() {
    const snap = this.loadSavedSnapshot();
    if (!snap || !snap.roomId) return;
    // Nếu ván đã ở màn kết quả cuối thì không cần resume nữa.
    if (snap.screen === 'screen-result' || snap.screen === 'screen-setup') { this.clearProgress(); return; }
    const banner = document.getElementById('resume-banner');
    const info = document.getElementById('resume-info');
    const finishedCount = (snap.players || []).filter(p => p.eliminated).length;
    info.textContent = `Phòng ${snap.roomId} · ${snap.players.length} người chơi · đã loại ${finishedCount} người`;
    banner.style.display = 'block';
    this._resumeSnapshot = snap;
  },
  dismissResume() {
    this.clearProgress();
    document.getElementById('resume-banner').style.display = 'none';
  },
  resumeGame() {
    const snap = this._resumeSnapshot;
    if (!snap) return;
    Object.assign(this, {
      roomId: snap.roomId, hostToken: snap.hostToken,
      numPlayers: snap.numPlayers, numImposters: snap.numImposters,
      imposterMode: snap.imposterMode, hiddenTopicMode: snap.hiddenTopicMode,
      multiRound: snap.multiRound, timerEnabled: snap.timerEnabled,
      timerMinutes: snap.timerMinutes, revealRoleMode: snap.revealRoleMode !== false,
      players: snap.players, currentPlayerIndex: snap.currentPlayerIndex,
      realWord: snap.realWord, realMeaning: snap.realMeaning,
    });
    document.getElementById('resume-banner').style.display = 'none';
    const screen = snap.screen || 'screen-vote';
    if (screen === 'screen-handover' || screen === 'screen-reveal') {
      this.showHandover();
      this.showScreen('screen-handover');
    } else if (screen === 'screen-vote' || screen === 'screen-discuss') {
      this.goVote();
    } else {
      this.showScreen(screen);
    }
  },

  /* ----- Link phòng: hiện trên URL để dễ chia sẻ/bookmark, dùng để resume ----- */
  setRoomLink(roomId) {
    try {
      const url = new URL(location.href);
      url.searchParams.set('room', roomId);
      history.replaceState(null, '', url.toString());
    } catch (e) {}
  },
  clearRoomLink() {
    try {
      const url = new URL(location.href);
      url.searchParams.delete('room');
      history.replaceState(null, '', url.toString());
    } catch (e) {}
  },

  toggleRevealRole() {
    this.revealRoleMode = !this.revealRoleMode;
    const badge = document.getElementById('badge-reveal-role');
    badge.classList.toggle('off', !this.revealRoleMode);
    badge.textContent = this.revealRoleMode ? 'Bật' : 'Tắt';
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
  setHiddenTopicMode(mode) {
    this.hiddenTopicMode = mode;
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

    document.querySelectorAll('.segmented-btn[data-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === this.imposterMode);
    });

    // Sub-option: chỉ hiện khi chọn Ẩn danh
    const htWrap = document.getElementById('hiddenTopicWrap');
    htWrap.classList.toggle('show', this.imposterMode === 'hidden');
    document.querySelectorAll('.segmented-btn[data-topic]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.topic === this.hiddenTopicMode);
    });

    const mr = document.getElementById('badge-multiround');
    mr.classList.toggle('off', !this.multiRound);
    mr.textContent = this.multiRound ? 'Bật' : 'Tắt';

    const tm = document.getElementById('badge-timer');
    tm.classList.toggle('off', !this.timerEnabled);
    tm.textContent = this.timerEnabled ? 'Bật' : 'Tắt';
    document.getElementById('timerInputWrap').classList.toggle('show', this.timerEnabled);
  },

  /* ----- Cache tên người chơi gần nhất -> tự điền lại khi tạo phòng mới
     hoặc bấm "Chơi lại", khỏi phải gõ lại từ đầu ----- */
  NAMES_STORAGE_KEY: 'imposter_last_names_v1',
  saveNamesCache() {
    try {
      const names = this.players.map(p => p.name).filter(Boolean);
      localStorage.setItem(this.NAMES_STORAGE_KEY, JSON.stringify(names));
    } catch (e) {}
  },
  loadNamesCache() {
    try {
      const raw = localStorage.getItem(this.NAMES_STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  },

  /* ----- Names ----- */
  goNames() {
    this.timerMinutes = parseInt(document.getElementById('timerMinutes').value) || 3;
    this.validateConfig();
    const cached = this.loadNamesCache();
    this.players = [];
    for (let i = 0; i < this.numPlayers; i++) {
      this.players.push({
        name: cached[i] || `Người chơi ${i+1}`,
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
      el.style.cssText = 'position:fixed;inset:0;background:rgba(6,9,15,0.82);display:none;flex-direction:column;align-items:center;justify-content:center;z-index:500;gap:10px;padding:24px;text-align:center;';
      el.innerHTML = '<div id="api-busy-label" style="color:#f2e9d8;font-weight:700;font-size:1rem;"></div>'
        + '<div id="api-busy-sub" style="color:#8b93a6;font-size:0.82rem;min-height:1.2em;"></div>';
      document.body.appendChild(el);
    }
    document.getElementById('api-busy-label').textContent = label || 'Đang xử lý...';
    document.getElementById('api-busy-sub').textContent = '';
    el.style.display = isBusy ? 'flex' : 'none';
  },
  setBusySub(msg) {
    const el = document.getElementById('api-busy-sub');
    if (el) el.textContent = msg || '';
  },
  showApiError(err) {
    console.error(err);
    alert(err.message || 'Có lỗi xảy ra khi kết nối server.');
  },

  /* ----- Gán vai trò local (không cần backend) ----- */
  goHandover() {
    this.players.forEach((p, i) => {
      if (!p.name.trim()) p.name = `Người chơi ${i+1}`;
    });
    this.saveNamesCache();

    // LocalEngine random từ và gán secret cho từng người
    const { realWord, meaning } = LocalEngine.startGame({
      players: this.players,
      numImposters: this.numImposters,
      imposterMode: this.imposterMode,
      hiddenTopicMode: this.hiddenTopicMode,
    });
    this.realWord = realWord;
    this.realMeaning = meaning;

    this.players.forEach((p, i) => {
      p.playerId = i;
      p.eliminated = false;
      p.secret = LocalEngine.getSecret(i);
    });

    this.offlineMode = false;
    this.roomId = 'local';

    this.currentPlayerIndex = 0;
    this.showHandover();
    this.showScreen('screen-handover');
    this.saveProgress();
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

  /* ----- Xem từ bí mật: lấy từ LocalEngine (đã gán sẵn lúc goHandover) ----- */
  showReveal() {
    const p = this.players[this.currentPlayerIndex];
    const wordEl = document.getElementById('secret-word');
    const hintEl = document.getElementById('secret-hint');
    const secret = p.secret;
    this.saveProgress();

    if (secret.role === 'imposter' && secret.is_imposter_aware) {
      wordEl.textContent = 'KẺ GIẤU MẶT';
      wordEl.style.color = 'var(--coral-soft)';
      wordEl.style.fontSize = '2rem';
      hintEl.innerHTML = `Gợi ý cho bạn: <b style="color:var(--paper)">${secret.hint}</b>`;
    } else {
      wordEl.textContent = secret.word;
      wordEl.style.color = 'var(--paper)';
      wordEl.style.fontSize = '';
      if (secret.meaning) {
        hintEl.innerHTML = `Giải thích: <span style="color:var(--paper)">${secret.meaning}</span>`;
      } else {
        hintEl.textContent = 'Hãy ghi nhớ từ này';
      }
    }

    document.getElementById('anti-cheat-overlay').style.display = 'none';
    this.showScreen('screen-reveal');
  },
  finishReveal() {
    this.currentPlayerIndex++;
    this.saveProgress();
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
    this.saveProgress();
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

  /* ----- Loại người chơi: SERVER quyết định đúng/sai + thắng/thua
     (nếu backend lỗi/không kết nối được, tự tính cục bộ bằng dữ liệu
     đã cache từ lúc từng người xem bí mật, để ván vẫn chơi tiếp được) ----- */
  async doEliminate() {
    this.closeModal();
    const idx = this.votedIndex;
    if (idx == null) return;
    const p = this.players[idx];

    let result = this.localEliminate(p);

    p.eliminated = true;
    this.pendingGameOver = result.game_over;
    this.pendingWinner = result.winner;
    this.saveProgress();

    document.getElementById('elim-avatar').style.background = p.color;
    document.getElementById('elim-avatar').textContent = this.getInitials(p.name);
    document.getElementById('elim-name').textContent = p.name;

    const showRole = this.revealRoleMode || result.game_over;
    const roleEl = document.getElementById('elim-role');
    const verdict = document.getElementById('elim-verdict');
    if (showRole) {
      roleEl.style.display = '';
      roleEl.textContent = result.role_label;
      roleEl.className = 'badge-role ' + (result.was_imposter ? 'badge-imposter' : 'badge-civilian');
      if (result.was_imposter) {
        verdict.textContent = '✅ Chính xác! Bạn đã tìm ra Kẻ giấu mặt.';
        verdict.className = 'elim-verdict correct';
      } else {
        verdict.textContent = '❌ Đoán sai rồi! Đây là Dân thường.';
        verdict.className = 'elim-verdict wrong';
      }
    } else {
      roleEl.style.display = 'none';
      verdict.textContent = 'Người chơi đã bị loại khỏi ván đấu.';
      verdict.className = 'elim-verdict';
    }

    // Từ chỉ được lộ khi ván đã kết thúc hẳn (game_over) — không bao giờ
    // lộ giữa ván, kể cả khi bật "tiết lộ vai trò".
    document.getElementById('elim-word').textContent = result.game_over ? (result.revealed_word || '') : '';
    const elimMeaningEl = document.getElementById('elim-meaning');
    if (elimMeaningEl) {
      elimMeaningEl.textContent = (result.game_over && result.revealed_meaning) ? `Giải thích: ${result.revealed_meaning}` : '';
    }

    const btn = document.getElementById('btn-elim-next');
    btn.textContent = result.game_over ? 'Xem kết quả cuối cùng' : 'Tiếp tục vòng tiếp theo';
    btn.onclick = result.game_over ? () => this.goResults() : () => this.goNextRound();

    this.showScreen('screen-elimination');
  },

  /* ----- Fallback cục bộ: chỉ dùng được nếu MỌI người chơi đã xem bí mật
     trên chính máy này (nên có đủ role/word để tự tính đúng-sai/thắng-thua) ----- */
  canRunOffline() {
    return this.players.length > 0 && this.players.every(p => p && p.secret);
  },
  localEliminate(p) {
    const wasImposter = p.secret.role === 'imposter';
    const activeImpCount = this.players.filter(x => !x.eliminated && x.secret.role === 'imposter').length
      - (wasImposter ? 1 : 0);
    const activeCivCount = this.players.filter(x => !x.eliminated && x.secret.role === 'civilian').length
      - (!wasImposter ? 1 : 0);

    let gameOver, winner;
    if (!this.multiRound) {
      gameOver = true; winner = wasImposter ? 'civilian' : 'imposter';
    } else if (activeImpCount === 0) {
      gameOver = true; winner = 'civilian';
    } else if (activeImpCount >= activeCivCount) {
      gameOver = true; winner = 'imposter';
    } else {
      gameOver = false; winner = null;
    }

    let revealedWord = '', revealedMeaning = null;
    if (gameOver) {
      if (wasImposter) {
        revealedWord = p.secret.is_imposter_aware ? p.secret.hint : p.secret.word;
        revealedMeaning = p.secret.is_imposter_aware ? null : p.secret.meaning;
      } else {
        revealedWord = this.realWord || p.secret.word;
        revealedMeaning = this.realMeaning || p.secret.meaning;
      }
    }

    return {
      eliminated_player_id: p.playerId,
      was_imposter: wasImposter,
      role_label: wasImposter ? 'Kẻ giấu mặt' : 'Dân thường',
      revealed_word: revealedWord,
      revealed_meaning: revealedMeaning,
      game_over: gameOver,
      winner: winner,
    };
  },

  goNextRound() {
    if (this.timerEnabled) {
      this.startDiscussion();
    } else {
      this.goVote();
    }
  },

  /* ----- Results: lấy đầy đủ vai trò/từ từ server (chỉ cho phép khi đã finished);
     fallback dựng lại từ cache cục bộ nếu backend không phản hồi được ----- */
  goResults() {
    let reveal = this.localReveal();
    this.showScreen('screen-result');
    this.clearProgress();
    this.clearRoomLink();

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
      const meaningText = p.revealed_meaning ? `<div style="font-size:0.75rem; color:var(--ghost); margin-top:2px;">Giải thích: ${p.revealed_meaning}</div>` : '';
      return `
        <div class="result-item">
          <div class="result-meta">
            <div class="result-avatar" style="background:${p.color}">${this.getInitials(p.name)}</div>
            <div>
              <div style="font-weight:700;">${p.name}${elimMark}</div>
              <div style="font-size:0.8rem; color:var(--paper); margin-top:2px;"><b>Từ:</b> ${p.revealed_word}</div>
              ${meaningText}
            </div>
          </div>
          <div class="badge-role ${roleClass}">${roleLabel}</div>
        </div>
      `;
    }).join('');

    this.startConfetti();
  },

  localReveal() {
    return {
      winner: this.pendingWinner,
      players: this.players.map(p => {
        const wasImposter = p.secret.role === 'imposter';
        return {
          id: p.playerId, name: p.name, color: p.color, role: p.secret.role,
          revealed_word: wasImposter
            ? (p.secret.is_imposter_aware ? p.secret.hint : p.secret.word)
            : (this.realWord || p.secret.word),
          revealed_meaning: wasImposter
            ? (p.secret.is_imposter_aware ? null : p.secret.meaning)
            : (this.realMeaning || p.secret.meaning),
          eliminated: p.eliminated,
        };
      }),
    };
  },

  /* ----- Replay ----- */
  replayKeepConfig() {
    this.confettiRunning = false;
    this.clearProgress();
    this.clearRoomLink();
    this.players.forEach((p) => {
      p.eliminated = false;
      p.playerId = null;
      p.secret = null;
    });
    this.renderNames();
    this.showScreen('screen-names');
  },
  replayNewGame() {
    this.confettiRunning = false;
    this.clearProgress();
    this.clearRoomLink();
    this.resetToSetup();
    this.showScreen('screen-setup');
  },
  resetToSetup() {
    this.numPlayers = 5;
    this.numImposters = 1;
    this.imposterMode = 'aware';
    this.hiddenTopicMode = 'same_topic';
    this.multiRound = true;
    this.timerEnabled = false;
    this.timerMinutes = 3;
    this.players = [];
    this.currentPlayerIndex = 0;
    this.votedIndex = null;
    // Reset local state.
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
App.checkResumable();
window.addEventListener('resize', () => {
  const cvs = document.getElementById('confetti');
  if (cvs) { cvs.width = window.innerWidth; cvs.height = window.innerHeight; }
});