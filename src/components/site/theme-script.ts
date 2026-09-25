// Plain module (no 'use client') so server components can inline the script.
export const THEME_KEY = 'vc-landing-theme'
export const THEME_SCRIPT = `try{if(localStorage.getItem('${THEME_KEY}')==='light')document.documentElement.setAttribute('data-lp-theme','light')}catch(e){}`
