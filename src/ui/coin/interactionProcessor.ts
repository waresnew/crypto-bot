import {db, genSqlInsertCommand, idToCrypto} from "../../database";
import {UserSetting, UserSettingType} from "../../structs/usersettings";
import InteractionProcessor from "../abstractInteractionProcessor";
import {makeButtons, makeEmbed, makeFavouritesMenu} from "./interfaceCreator";
import CryptoStat from "../../structs/cryptoStat";
import {
    APIButtonComponentWithCustomId,
    APIMessageComponentButtonInteraction,
    APIMessageComponentSelectMenuInteraction,
    ComponentType,
    InteractionResponseType,
    MessageFlags
} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {commandIds} from "../../utils";
import {analytics} from "../../analytics/segment";
import {getEmbedTemplate} from "../templates";

export default class CoinInteractionProcessor extends InteractionProcessor {

    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply): Promise<void> {
        const coin = await idToCrypto(interaction.data.custom_id.split("_")[2]);
        if (interaction.data.custom_id.startsWith("coin_alerts")) {
            const sortedOptions = CryptoStat.listLongs().sort((a, b) => a.length - b.length);
            const message = getEmbedTemplate();
            message.title = `Adding alert for ${coin.name}`;
            message.description = `You are currently adding an alert for ${coin.name}. If you want to track another coin, please pass a different coin to </coin:${commandIds.get("coin")}>.

Please select the stat you would like to be alerted by.`;
            await http.send({
                type: InteractionResponseType.ChannelMessageWithSource, data: {
                    embeds: [message],
                    flags: MessageFlags.Ephemeral,
                    components: [{
                        type: ComponentType.ActionRow,
                        components: [{
                            type: ComponentType.StringSelect,
                            placeholder: "Select a stat...",
                            custom_id: `alertwizard_alertstat_${coin.id}_${interaction.user.id}`,
                            options: sortedOptions.map(entry => {
                                return {
                                    label: entry[0].toUpperCase() + entry.substring(1),
                                    value: CryptoStat.longToShort(entry)
                                };
                            })
                        }]
                    }]
                }
            });
        } else if (interaction.data.custom_id.startsWith("coin_setfav")) {
            if (!await db.get("select * from user_settings where id=? and type=? and favouriteCrypto=?", interaction.user.id, UserSettingType[UserSettingType.FAVOURITE_CRYPTO], coin.id)) {
                if ((await db.get("select count(id) from user_settings where id=? and type=?", interaction.user.id, UserSettingType[UserSettingType.FAVOURITE_CRYPTO]))["count(id)"] >= 25) {
                    await http.send({
                        type: InteractionResponseType.ChannelMessageWithSource, data: {
                            content: "Error: You can not have more than 25 favourited cryptos.",
                            flags: MessageFlags.Ephemeral
                        }
                    });
                    return;
                }
                const setting = new UserSetting();
                setting.id = interaction.user.id;
                setting.favouriteCrypto = coin.id;
                setting.type = UserSettingType[UserSettingType.FAVOURITE_CRYPTO];
                analytics.track({
                    userId: interaction.user.id,
                    event: "Favourited a coin",
                    properties: {
                        coin: coin.symbol
                    }
                });
                await genSqlInsertCommand(setting, "user_settings", new UserSetting());
            } else {
                if ((interaction.message.components[0].components.find(c => c.type == ComponentType.Button && (c as APIButtonComponentWithCustomId).custom_id == interaction.data.custom_id) as APIButtonComponentWithCustomId).label == "Favourite") {
                    await http.send({
                        type: InteractionResponseType.ChannelMessageWithSource, data: {
                            content: "Error: You already have this coin favourited.",
                            flags: MessageFlags.Ephemeral
                        }
                    });
                    return;
                }
                analytics.track({
                    userId: interaction.user.id,
                    event: "Unfavourited a coin",
                    properties: {
                        coin: coin.symbol
                    }
                });
                await db.run("delete from user_settings where id=? and favouriteCrypto=?", interaction.user.id, coin.id);
            }
            const newButtons = await makeButtons(coin, interaction);
            const newMenu = await makeFavouritesMenu(interaction);
            await http.send({
                type: InteractionResponseType.UpdateMessage,
                data: {embeds: interaction.message.embeds, components: [newButtons, newMenu]}
            });
        } else if (interaction.data.custom_id.startsWith("coin_refresh")) {
            analytics.track({
                userId: interaction.user.id,
                event: "Refreshed a coin",
                properties: {
                    coin: coin.symbol
                }
            });
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    components: [await makeButtons(await idToCrypto(interaction.data.custom_id.split("_")[2]), interaction), await makeFavouritesMenu(interaction)],
                    embeds: [await makeEmbed(coin)]
                }
            });
        }
    }

    static override async processStringSelect(interaction: APIMessageComponentSelectMenuInteraction, http: FastifyReply): Promise<void> {

        const selected = interaction.data.values[0];
        if (selected == "default") {
            await http.send({
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {content: "Favourite a coin to add it to the list!", flags: MessageFlags.Ephemeral}
            });
            return;
        }

        const coin = await idToCrypto(selected);
        analytics.track({
            userId: interaction.user.id,
            event: "Selected a favourite coin",
            properties: {
                coin: coin.symbol
            }
        });
        await http.send({
            type: InteractionResponseType.UpdateMessage, data: {
                components: [await makeButtons(coin, interaction), await makeFavouritesMenu(interaction)],
                embeds: [await makeEmbed(coin)]
            }
        });
    }
}