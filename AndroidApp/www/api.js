/* ================================================================
   LOCAL ENGINE — không cần backend, chạy 100% trên thiết bị.
   Thay thế hoàn toàn api.js cũ.
   ================================================================ */

/* ---------- Từ vựng ---------- */
let WORD_PAIRS = [];
fetch('./word_pairs.json')
  .then(res => res.json())
  .then(data => { WORD_PAIRS = data; });

/* ---------- Tiện ích random ---------- */
function randInt(max) { return Math.floor(Math.random() * max); }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- Local game engine ---------- */
const LocalEngine = {
  _state: null,

  /** Gọi thay cho createRoom + joinRoom + updateConfig + startGame */
  startGame({ players, numImposters, imposterMode, hiddenTopicMode }) {
    const pair = WORD_PAIRS[randInt(WORD_PAIRS.length)];
    const realWord    = pair.real;
    const relatedWord = pair.related;
    const hint        = pair.hint;
    const meaning     = pair.meaning;

    // Chọn ai là imposter
    const indices = shuffle(players.map((_, i) => i));
    const imposterIndices = new Set(indices.slice(0, numImposters));

    let differentTopicWord = null;
    if (imposterMode === 'hidden' && hiddenTopicMode === 'different_topic') {
      const otherPairs = WORD_PAIRS.filter(p => p !== pair);
      differentTopicWord = otherPairs.length > 0 ? otherPairs[randInt(otherPairs.length)].real : relatedWord;
    }

    const secrets = players.map((_, i) => {
      const isImposter = imposterIndices.has(i);
      if (!isImposter) {
        return { role: 'civilian', word: realWord, meaning };
      }
      // Imposter
      const isAware = (imposterMode === 'aware');
      if (isAware) {
        return { role: 'imposter', is_imposter_aware: true,
                 word: 'KẺ GIẤU MẶT', hint, meaning: null };
      } else {
        const impWord = (hiddenTopicMode === 'different_topic')
          ? differentTopicWord
          : relatedWord;
        return { role: 'imposter', is_imposter_aware: false,
                 word: impWord, meaning: null };
      }
    });

    this._state = { secrets, realWord, meaning };
    return { realWord, meaning };
  },

  getSecret(playerIndex) {
    return this._state.secrets[playerIndex];
  },

  getRealWord() {
    return { word: this._state?.realWord, meaning: this._state?.meaning };
  },
};
