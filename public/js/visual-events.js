(function(){
  if(window.FFFEvents) return;

  const listeners = new Map();

  function on(eventName, handler){
    if(!eventName || typeof handler !== 'function') return function(){};
    const list = listeners.get(eventName) || [];
    list.push(handler);
    listeners.set(eventName, list);
    return function off(){
      const current = listeners.get(eventName) || [];
      const next = current.filter(fn => fn !== handler);
      if(next.length) listeners.set(eventName, next);
      else listeners.delete(eventName);
    };
  }

  function emit(eventName, payload){
    if(!eventName) return;
    const event = {
      type: eventName,
      payload: payload || {},
      at: Date.now()
    };
    const list = listeners.get(eventName) || [];
    for(const handler of list){
      try{ handler(event); }catch(_){ }
    }
    try{
      window.dispatchEvent(new CustomEvent('fff:' + eventName, { detail: event }));
    }catch(_){ }
    return event;
  }

  function once(eventName, handler){
    if(typeof handler !== 'function') return function(){};
    const off = on(eventName, event => {
      off();
      handler(event);
    });
    return off;
  }

  window.FFFEvents = { on, once, emit };
})();
