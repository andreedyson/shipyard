const isBrowser = () => typeof window !== "undefined";

export function redirectToLogin() {
  if (!isBrowser()) {
    return;
  }

  window.location.assign("/login");
}
