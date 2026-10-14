// App Routes and Navigation Definitions for Flashgram

export const ROUTES = {
  HOME: "home",
  REELS: "reels",
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
    if (!Object.values(ROUTES).includes(route)) return;
    this.currentRoute = route;
    this.listeners.forEach(cb => {
      try {
        cb(route);
      } catch (e) {
        console.warn("Router listener error:", e);
      }
    });

    if (typeof window !== "undefined" && typeof window.switchTab === "function") {
      window.switchTab(route);
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
