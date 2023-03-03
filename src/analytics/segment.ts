import Analytics from "analytics-node";

export let analytics: Analytics = null;

export function setAnalytics(a: Analytics) {
    analytics = a;
}

export function initAnalytics() {
    analytics = new Analytics(process.env["SEGMENT_KEY"]);
}
