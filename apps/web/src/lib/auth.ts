const PIN_KEY = "shipyard_pin";

export const PIN_HEADER = "x-shipyard-pin";
export const PIN_QUERY_PARAM = "pin";

const isBrowser = () => typeof window !== "undefined";

export function getPin() {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(PIN_KEY);
}

export function setPin(pin: string) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(PIN_KEY, pin);
}

export function removePin() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(PIN_KEY);
}

export function redirectToLogin() {
  if (!isBrowser()) {
    return;
  }

  window.location.assign("/login");
}
