/* eslint-disable @typescript-eslint/no-unused-vars */
import {ButtonInteraction, ModalSubmitInteraction, StringSelectMenuInteraction} from "discord.js";

export default abstract class InteractionProcessor {

    static processModal(_interaction: ModalSubmitInteraction): Promise<void> {
        return undefined;
    }

    static processButton(_interaction: ButtonInteraction): Promise<void> {
        return undefined;
    }

    static processStringSelect(_interaction: StringSelectMenuInteraction): Promise<void> {
        return undefined;
    }
}