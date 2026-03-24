(function(){
  if(window.FFFVisual) return;

  function byId(id){
    return document.getElementById(id);
  }

  function createCanvas(id){
    const canvas = document.createElement('canvas');
    canvas.className = 'render-canvas';
    canvas.dataset.layerCanvas = id;
    return canvas;
  }

  function ensureLayerCanvas(layer, id){
    if(!layer) return null;
    let canvas = layer.querySelector('canvas');
    if(!canvas){
      canvas = createCanvas(id);
      layer.appendChild(canvas);
    }
    return canvas;
  }

  function sizeCanvas(canvas, width, height){
    if(!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
  }

  function bootstrap(){
    const root = byId('renderRoot');
    const threeLayer = byId('threeLayer');
    const pixiLayer = byId('pixiLayer');
    if(!root || !threeLayer || !pixiLayer) return null;

    const threeCanvas = ensureLayerCanvas(threeLayer, 'three');
    const pixiCanvas = ensureLayerCanvas(pixiLayer, 'pixi');

    const api = {
      root,
      layers: {
        three: threeLayer,
        pixi: pixiLayer,
        ui: document.body
      },
      canvases: {
        three: threeCanvas,
        pixi: pixiCanvas
      },
      libs: {
        three: null,
        pixi: null
      },
      themes: {
        visual: null,
        effects: null
      },
      stats: {
        three: null,
        pixi: null
      },
      state: {
        ready: false,
        width: 0,
        height: 0,
        screen: 'title'
      },
      setScreen(screen){
        this.state.screen = screen || 'title';
        root.dataset.screen = this.state.screen;
      },
      resize(){
        const width = Math.max(window.innerWidth || 0, 1);
        const height = Math.max(window.innerHeight || 0, 1);
        this.state.width = width;
        this.state.height = height;
        sizeCanvas(threeCanvas, width, height);
        sizeCanvas(pixiCanvas, width, height);
      },
      registerLibs(libs){
        this.libs.three = libs && libs.three ? libs.three : this.libs.three;
        this.libs.pixi = libs && libs.pixi ? libs.pixi : this.libs.pixi;
        this.state.ready = !!(this.libs.three && this.libs.pixi);
        root.dataset.libsReady = this.state.ready ? 'true' : 'false';
      },
      registerThemes(themes){
        this.themes.visual = themes && themes.visual ? themes.visual : this.themes.visual;
        this.themes.effects = themes && themes.effects ? themes.effects : this.themes.effects;
        root.dataset.themesReady = (this.themes.visual || this.themes.effects) ? 'true' : 'false';
      },
      updateStats(name, value){
        if(!name) return;
        this.stats[name] = value || null;
      },
      getStatsSnapshot(){
        return {
          screen: this.state.screen,
          ready: this.state.ready,
          three: this.stats.three,
          pixi: this.stats.pixi
        };
      },
      logStats(){
        const snapshot = this.getStatsSnapshot();
        try{
          console.table(snapshot);
        }catch(_){
          console.log(snapshot);
        }
        return snapshot;
      }
    };

    api.resize();
    window.addEventListener('resize', () => api.resize());
    return api;
  }

  function registerVisualLibs(libs){
    if(window.FFFVisual && typeof window.FFFVisual.registerLibs === 'function'){
      window.FFFVisual.registerLibs(libs);
    }
  }

  window.__FFF_REGISTER_VISUAL_LIBS__ = registerVisualLibs;
  window.addEventListener('fff:visual-libs-ready', event => {
    registerVisualLibs(event && event.detail ? event.detail : null);
  });

  window.FFFVisual = bootstrap();
  if(window.FFFVisual){
    registerVisualLibs({
      three: window.THREE || null,
      pixi: window.PIXI || null
    });
    window.__FFF_VISUAL_STATS__ = () => window.FFFVisual && typeof window.FFFVisual.getStatsSnapshot === 'function'
      ? window.FFFVisual.getStatsSnapshot()
      : null;
    window.FFFVisual.root.dataset.bootstrap = 'ready';
  }
})();
