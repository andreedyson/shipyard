const isBrowser = () => typeof window !== "undefined";

export function redirectToLogin() {
  if (!isBrowser()) {
    return;
  }

  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

export function redirectToDashboard() {
  if (!isBrowser()) {
    return;
  }

  if (window.location.pathname !== "/") {
    window.location.replace("/");
  }
}
