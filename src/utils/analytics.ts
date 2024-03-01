/* istanbul ignore file */
import {Analytics} from "@segment/analytics-node";

export let analytics: Analytics = null;

export function setAnalytics(a: Analytics) {
    analytics = a;
}

export function initAnalytics() {
    analytics = new Analytics({writeKey: process.env["SEGMENT_KEY"]});
}
