import { SlashCommandBuilder, Collection } from "discord.js";
declare module "discord.js" {
    export interface Client {
        commands: Collection<string, Command>;
    }
    export interface Command {
        data: SlashCommandBuilder;
        execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
        autocomplete: (interaction: AutocompleteInteraction) => Promise<void>;
    }
}
