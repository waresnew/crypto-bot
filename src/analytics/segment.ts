import Analytics from "analytics-node";

export const analytics = new Analytics(process.env["SEGMENT_KEY"]);
