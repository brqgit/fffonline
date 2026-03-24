export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function waitForVisualRuntime(requiredLibs = []) {
  for (let i = 0; i < 200; i += 1) {
    const visual = window.FFFVisual || null;
    const events = window.FFFEvents || null;
    const libs = {};
    let ready = !!(visual && events);
    for (const libName of requiredLibs) {
      const key = String(libName || '').trim();
      if (!key) continue;
      libs[key] = window[key] || null;
      if (!libs[key]) {
        ready = false;
      }
    }
    if (ready) {
      return {
        visual,
        events,
        libs
      };
    }
    await wait(25);
  }
  return null;
}
