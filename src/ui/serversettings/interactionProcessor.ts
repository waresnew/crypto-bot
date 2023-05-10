import InteractionProcessor from "../abstractInteractionProcessor";

export default class ServerSettingsInteractionProcessor extends InteractionProcessor {
    static override async processButton(): Promise<void> {
        throw new Error("Method not implemented.");
    }
}