const wxLoginScriptUrl = 'https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js';

export interface WxLoginOptions {
  readonly appid: string;
  readonly scope: string;
  readonly redirect_uri: string;
  readonly state: string;
  readonly self_redirect: boolean;
}

interface WxLoginConstructorOptions extends WxLoginOptions {
  readonly id: string;
}

type WxLoginConstructor = new (options: WxLoginConstructorOptions) => unknown;

declare global {
  interface Window {
    WxLogin?: WxLoginConstructor;
  }
}

let loadingPromise: Promise<void> | null = null;

export function loadWxLoginScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('WxLogin requires a browser window.'));
  if (window.WxLogin) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = wxLoginScriptUrl;
    script.async = true;

    script.addEventListener('load', () => {
      if (window.WxLogin) {
        resolve();
        return;
      }
      reject(new Error('WxLogin script loaded without exposing window.WxLogin.'));
    }, { once: true });
    script.addEventListener('error', () => {
      loadingPromise = null;
      reject(new Error('WxLogin script failed to load.'));
    }, { once: true });

    document.body.appendChild(script);
  });

  return loadingPromise;
}

export function mountWxLogin(options: WxLoginOptions, containerId: string): { readonly dispose: () => void } {
  const container = document.getElementById(containerId);
  if (!container) throw new Error('WxLogin container is missing.');
  if (!window.WxLogin) throw new Error('WxLogin script is not ready.');

  container.replaceChildren();
  new window.WxLogin({ ...options, id: containerId });

  return {
    dispose: () => {
      container.replaceChildren();
    },
  };
}
