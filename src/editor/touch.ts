// How the canvas and the Layers list behave for fingers. The phone shell turns `phone` on while it is shown;
// "Select several" turns `several` on, so taps add to the selection instead of replacing it.
export const touchCanvas = { phone: false, several: false }

/** A finger is the main pointer on this device. */
export const isCoarse = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches

/** Long press: how long a finger rests before the actions for what is under it open. */
export const LONG_PRESS_MS = 520
