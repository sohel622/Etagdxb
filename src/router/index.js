// App Routes and Navigation Definitions for Flashgram

export const ROUTES = {
  HOME: "home",
  REELS: "home",
  MUSIC: "music",
  PROFILE: "profile",
  DIRECT: "direct"
};

export class AppRouter {
  constructor() {
    this.currentRoute = ROUTES.HOME;
    this.listeners = [];
  }

  getRoute() {
    return this.currentRoute;
  }

  navigate(route) {
    const resolvedRoute = (route === "reels" || route === "/reels") ? ROUTES.HOME : route;
    if (!Object.values(ROUTES).includes(resolvedRoute)) return;
    this.currentRoute = resolvedRoute;
    this.listeners.forEach(cb => {
      try {
        cb(resolvedRoute);
      } catch (e) {
        console.warn("Router listener error:", e);
      }
    });

    if (typeof window !== "undefined" && typeof window.switchTab === "function") {
      window.switchTab(resolvedRoute);
    }
  }

  onRouteChange(cb) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }
}

export const router = new AppRouter();
