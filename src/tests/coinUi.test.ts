/* eslint-disable @typescript-eslint/no-explicit-any */
import {btcEthApiData, mockCommandInteraction, mockReply} from "./testSetup";
import coinCmd from "../commands/coin";
import {
    APIEmbed,
    APIInteractionResponseCallbackData,
    APIModalSubmitInteraction,
    ComponentType,
    InteractionResponseType
} from "discord-api-types/v10";
import {updateCmc} from "../services/cmcApi";
import fetchMock from "jest-fetch-mock";
import CoinInteractionProcessor from "../ui/coin/interactionProcessor";
import {APIModalInteractionResponseCallbackData} from "discord-api-types/payloads/v10/_interactions/responses";
import {db} from "../database";
import {APIStringSelectComponent} from "discord-api-types/payloads/v10/channel";
import Mock = jest.Mock;

let msg: Mock<any, any, any> = null, embed: APIEmbed = null;
beforeAll(async () => {
    fetchMock.once(btcEthApiData);
    await updateCmc();
    await coinCmd.execute(mockCommandInteraction, mockReply);
    expect(mockReply.send).toHaveBeenCalled();
    msg = mockReply.send as Mock<any, any, any>;
    embed = msg.mock.calls[0][0].data.embeds[0] as APIEmbed;
});

async function clickFavourite(favourite: boolean) {
    await CoinInteractionProcessor.processButton({
        app_permissions: undefined,
        application_id: "",
        channel_id: undefined,
        data: {
            custom_id: "coin_setfav_123",
            component_type: 2
        },
        id: "",
        locale: undefined,
        token: "",
        type: undefined,
        version: 1,
        user: {id: "123", username: "123", discriminator: "123", avatar: "123"},
        message: {
            id: "123",
            type: undefined,
            content: "",
            channel_id: "",
            embeds: [{
                title: "Bitcoin (BTC-USD)",
                thumbnail: {url: "https://s2.coinmarketcap.com/static/img/coins/128x128/1.png"}
            }],
            author: undefined,
            timestamp: undefined,
            edited_timestamp: undefined,
            tts: undefined,
            mention_everyone: undefined,
            mentions: undefined,
            mention_roles: undefined,
            attachments: undefined,
            pinned: undefined,
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 1,
                            custom_id: "coin_setfav_123",
                            label: favourite ? "Favourite" : "Unfavourite",
                            emoji: {
                                name: "⭐"
                            }
                        }
                    ]
                }
            ]
        }
    }, mockReply);
}

describe("Tests /coin interface", () => {
    it("displays the coin embed correctly after cmd", async () => {
        expect(msg.mock.calls[0][0].type).toBe(InteractionResponseType.ChannelMessageWithSource);
        expect(embed.title).toBe("Bitcoin (BTC-USD)");
        expect(embed.thumbnail.url).toBe("https://s2.coinmarketcap.com/static/img/coins/128x128/1.png");
        expect(embed.fields[0].name).toBe("Price");
        expect(embed.fields[0].value).toBe("$9283.92 🟢");
        expect(msg.mock.calls[0][0].data.components[0].components[0].label).toBe("Add alert");
        expect(msg.mock.calls[0][0].data.components[0].components[1].label).toBe("Favourite");
    });

    it("displays the alert modal correctly after click button", async () => {
        await CoinInteractionProcessor.processButton({
            app_permissions: undefined,
            application_id: "",
            channel_id: undefined,
            data: {
                custom_id: "coin_alerts_123",
                component_type: 2
            },
            id: "",
            locale: undefined,
            token: "",
            type: undefined,
            version: 1,
            user: {id: "123", username: "123", discriminator: "123", avatar: "123"},
            message: {
                id: "123",
                type: undefined,
                content: "",
                channel_id: "",
                embeds: [{
                    title: "Bitcoin (BTC-USD)",
                    thumbnail: {url: "https://s2.coinmarketcap.com/static/img/coins/128x128/1.png"}
                }],
                author: undefined,
                timestamp: undefined,
                edited_timestamp: undefined,
                tts: undefined,
                mention_everyone: undefined,
                mentions: undefined,
                mention_roles: undefined,
                attachments: undefined,
                pinned: undefined
            }
        }, mockReply);
        const modal: APIModalInteractionResponseCallbackData = msg.mock.calls[0][0].data;
        expect(modal.custom_id).toBe("coin_alertsmodal_123");
        expect(modal.title).toBe("Adding alert for Bitcoin");
    });

    it("un/favourites the coin after click button", async () => {
        await CoinInteractionProcessor.processButton({
            app_permissions: undefined,
            application_id: "",
            channel_id: undefined,
            data: {
                custom_id: "coin_setfav_123",
                component_type: 2
            },
            id: "",
            locale: undefined,
            token: "",
            type: undefined,
            version: 1,
            user: {id: "123", username: "123", discriminator: "123", avatar: "123"},
            message: {
                id: "123",
                type: undefined,
                content: "",
                channel_id: "",
                embeds: [{
                    title: "Bitcoin (BTC-USD)",
                    thumbnail: {url: "https://s2.coinmarketcap.com/static/img/coins/128x128/1.png"}
                }],
                author: undefined,
                timestamp: undefined,
                edited_timestamp: undefined,
                tts: undefined,
                mention_everyone: undefined,
                mentions: undefined,
                mention_roles: undefined,
                attachments: undefined,
                pinned: undefined,
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: 1,
                                custom_id: "coin_setfav_123",
                                label: "Favourite",
                                emoji: {
                                    name: "⭐"
                                }
                            }
                        ]
                    }
                ]
            }
        }, mockReply);
        expect(db.get("select * from user_settings where id=\"123\" and type=\"FAVOURITE_CRYPTO\" and favouriteCrypto=1")).not.toBeUndefined();
        expect(((msg.mock.calls[0][0].data as APIInteractionResponseCallbackData).components.find(row => row.components[0].type == ComponentType.StringSelect).components[0] as APIStringSelectComponent).options[0].label).toBe("Bitcoin");

        await clickFavourite(false);
        expect(((msg.mock.calls[1][0].data as APIInteractionResponseCallbackData).components.find(row => row.components[0].type == ComponentType.StringSelect).components[0] as APIStringSelectComponent).options[0].label).toBe("Favourite a coin to add it here!");
        expect(await db.get("select * from user_settings where id=\"123\" and type=\"FAVOURITE_CRYPTO\" and favouriteCrypto=1")).toBeUndefined();
    });

    it("rejects favourite if >=25 favs", async () => {
        for (let i = 2; i <= 26; i++) {
            await db.run(`insert into user_settings(id,type,favouriteCrypto) values("123","FAVOURITE_CRYPTO",${i})`);
        }
        await clickFavourite(true);
        expect(await db.get("select * from user_settings where id=\"123\" and type=\"FAVOURITE_CRYPTO\" and favouriteCrypto=1")).toBeUndefined();
        expect(msg.mock.calls[0][0].data.content).toBe("Error: You can not have more than 25 favourited cryptos.");
        await db.run("delete from user_settings");
    });

    it("processes modal correctly", async () => {
        await CoinInteractionProcessor.processModal(genMockModalSubmit("price", ">500"), mockReply);
        expect(msg.mock.calls[0][0].data.content).toMatch(new RegExp("Done!.+"));
        expect(await db.get("select * from user_settings where id=\"123\" and type=\"ALERT\" and alertToken=1 and alertStat=\"price\" and alertThreshold=500")).not.toBeUndefined();
        await CoinInteractionProcessor.processModal(genMockModalSubmit("price", ">6"), mockReply);
        expect(await db.get("select * from user_settings where id=\"123\" and type=\"ALERT\" and alertToken=1 and alertStat=\"price\" and alertThreshold=6")).toBeUndefined();
        expect(msg.mock.calls[1][0].data.content).toBe("Error: You already have an alert that checks if the price of Bitcoin is greater than a certain amount.\nAdding another alert of this type would be redundant. Please delete your old one from </alerts:undefined> before proceeding.");
    });

    it("rejects duplicate favourites", async () => {
        await db.run("insert into user_settings(id,type,favouriteCrypto) values(\"123\",\"FAVOURITE_CRYPTO\",1)");
        await clickFavourite(true);
        expect(msg.mock.calls[0][0].data.content).toBe("Error: You already have this coin favourited.");
    });
});

function genMockModalSubmit(stat: string, threshold: string): APIModalSubmitInteraction {
    return {
        application_id: "",
        data: {
            custom_id: "coin_alertsmodal_123",
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 3,
                            custom_id: "coin_alertsmodalstat_123",
                            value: stat
                        }
                    ]
                },
                {
                    type: 1,
                    components: [
                        {
                            type: 3,
                            custom_id: "coin_alertsmodalvalue_123",
                            value: threshold
                        }
                    ]
                }
            ]
        },
        id: "",
        locale: undefined,
        token: "",
        type: undefined,
        version: 1,
        message: {
            id: "123",
            type: undefined,
            content: "",
            channel_id: "",
            embeds: [{
                title: "Bitcoin (BTC-USD)",
                thumbnail: {url: "https://s2.coinmarketcap.com/static/img/coins/128x128/1.png"}
            }],
            author: undefined,
            timestamp: undefined,
            edited_timestamp: undefined,
            tts: undefined,
            mention_everyone: undefined,
            mentions: undefined,
            mention_roles: undefined,
            attachments: undefined,
            pinned: undefined
        },
        user: {id: "123", username: "123", discriminator: "123", avatar: "123"}

    };
}