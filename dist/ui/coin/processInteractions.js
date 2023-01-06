import { chatInputApplicationCommandMention, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { whatOptions } from "../../globals.js";
import { db, genSqlInsertCommand } from "../../database.js";
import { UserSetting, UserSettingType } from "../../structs/usersettings.js";
import { editComponents } from "../editComponents.js";
import { genFavouritesMenu } from "./createInterfaces.js";
export async function processModals(modalResult, coin) {
    if (modalResult.customId == "alertsmodal") {
        const what = modalResult.fields.getTextInputValue("alertsmodalstat").toLowerCase();
        const when = modalResult.fields.getTextInputValue("alertsmodalvalue");
        if (!new RegExp(/^\d+$/).test(when)) {
            modalResult.reply({
                content: "The threshold you specified was not a number. Make sure to specify **only** the number itself (leave out `%` and `$`)",
                ephemeral: true
            });
            return;
        }
        if (!whatOptions.includes(what)) {
            modalResult.reply({
                content: "The stat you specified was invalid. Make sure to specify the exact string provided in the example (eg. `1h%` or `price`)",
                ephemeral: true
            });
            return;
        }
        let setting = new UserSetting();
        setting = new UserSetting();
        setting.id = modalResult.user.id;
        setting.type = UserSettingType[UserSettingType.ALERT];
        setting.alertStat = what;
        setting.alertThreshold = Number(when);
        setting.alertToken = coin.id;
        const manageAlertLink = chatInputApplicationCommandMention("managealerts", (await modalResult.client.application.commands.fetch()).find((command)=>command.name == "managealerts").id);
        if (Object.values(await db.get("select exists(select 1 from user_settings where alertToken=? and alertStat=?)", coin.id, what))[0]) {
            modalResult.reply({
                content: `You are already tracking the \`${what}\` of \`${coin.name}\`. You may remove your existing alert with ${manageAlertLink}.`,
                ephemeral: true
            });
            return;
        }
        if (Object.values(await db.get("select count(id) from user_settings where id=? and type=?", setting.id, setting.type))[0] >= 10) {
            modalResult.reply({
                content: `You can not have more than 10 active alerts. Please remove one before proceeding. ${manageAlertLink}`,
                ephemeral: true
            });
            return;
        }
        await genSqlInsertCommand(setting, "user_settings", new UserSetting());
        modalResult.reply({
            content: `Done! Added alert for ${coin.name}. Manage your alerts with ${manageAlertLink}`,
            ephemeral: true
        });
    }
}
export async function processButtons(interaction, coin) {
    if (interaction.customId == "alerts") {
        whatOptions.sort((a, b)=>a.length - b.length);
        const modal = new ModalBuilder().setCustomId("alertsmodal").setTitle(`Adding Alert for ${coin.name}`).addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("alertsmodalstat").setLabel("Which stat do you want to track?").setStyle(TextInputStyle.Short).setMaxLength(whatOptions[whatOptions.length - 1].length).setMinLength(1).setPlaceholder(whatOptions.join(", ")).setRequired(true))).addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("alertsmodalvalue").setLabel("At what threshold should you be alerted?").setStyle(TextInputStyle.Short).setMaxLength(10).setMinLength(1).setPlaceholder("20000").setRequired(true)));
        await interaction.showModal(modal);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        interaction.awaitModalSubmit({
            time: 60000,
            filter: (j)=>j.user.id == interaction.user.id
        }).then((modalResult)=>processModals(modalResult, coin)).catch((err)=>{
            console.log(err);
        //i.followUp("Alert form timed out. Did you take more than 1 minute to submit?"); //todo fix this
        });
    } else if (interaction.customId == "setfav") {
        if (interaction.component.label == "Favourite") {
            const setting = new UserSetting();
            setting.id = interaction.user.id;
            setting.favouriteCrypto = coin.id;
            setting.type = UserSettingType[UserSettingType.FAVOURITE_CRYPTO];
            await genSqlInsertCommand(setting, "user_settings", new UserSetting());
        } else {
            await db.run("delete from user_settings where id=? and favouriteCrypto=?", interaction.user.id, coin.id);
        }
        const newComponents = await editComponents(interaction.message, async (builder)=>{
            if (builder instanceof ButtonBuilder) {
                if (builder.data.custom_id == "setfav") {
                    return builder.setLabel(builder.data.label == "Favourite" ? "Unfavourite" : "Favourite").setStyle(builder.data.label == "Favourite" ? ButtonStyle.Secondary : ButtonStyle.Primary);
                } else {
                    return builder;
                }
            } else if (builder instanceof StringSelectMenuBuilder) {
                return builder.data.custom_id == "favCoins" ? await genFavouritesMenu(interaction) : builder;
            } else {
                return builder;
            }
        });
        interaction.update({
            embeds: interaction.message.embeds,
            components: [
                ...newComponents
            ]
        });
    }
}

//# sourceMappingURL=processInteractions.js.map