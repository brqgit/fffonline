(function(){
  const KEY = 'player_id';
  let id;
  try {
    id = localStorage.getItem(KEY);
  } catch (e) {}
  if (!id) {
    const gen = () => {
      if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
      }
      return String(Date.now()) + Math.random().toString(16).slice(2);
    };
    id = gen();
    try {
      localStorage.setItem(KEY, id);
    } catch (e) {}
  }
  window.PLAYER_ID = id;
})();
