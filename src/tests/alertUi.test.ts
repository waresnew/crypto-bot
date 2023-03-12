/* eslint-disable @typescript-eslint/no-explicit-any */
import alertsCmd from "../commands/alerts";
import {mockCommandInteraction, mockReply} from "./testSetup";
import AlertsInteractionProcessor from "../ui/alerts/interactionProcessor";
import {UserSetting} from "../structs/usersettings";
import {db, genSqlInsertCommand} from "../database";
import Mock = jest.Mock;

describe("Test /alert ui", () => {
    const msg = mockReply.send as Mock<any, any, any>;
    it("displays embed correctly", async () => {
        await alertsCmd.execute(mockCommandInteraction, mockReply);
        expect(msg.mock.calls[0][0].data.embeds[0].title).toBe("Your alerts");
        expect(msg.mock.calls[0][0].data.embeds[0].description).toMatch(new RegExp("Toggle/delete your crypto notifications here.+\\n\\nYou currently have no selected alerts"));
        expect(msg.mock.calls[0][0].data.components[0].components[0].options[0].label).toBe("You have no alerts.");
        expect(msg.mock.calls[0][0].data.components[1].components[0].label).toBe("Enable selected");
        expect(msg.mock.calls[0][0].data.components[1].components[1].label).toBe("Edit alert");
        expect(msg.mock.calls[0][0].data.components[1].components[2].label).toBe("Disable selected");
        expect(msg.mock.calls[0][0].data.components[1].components[3].label).toBe("Delete selected");
    });

    it("rejects edit if more than one selected", async () => {
        jest.spyOn(AlertsInteractionProcessor, "parseSelected").mockReturnValueOnce(Promise.resolve([new UserSetting(), new UserSetting()]));
        await AlertsInteractionProcessor.processButton({
            data: {
                custom_id: "alerts_edit_123"
            },
            user: {id: "123"}
        } as any, mockReply);
        expect(msg.mock.calls[0][0].data.content).toBe("Error: Please select only one alert to edit.");
    });

    it("edits alert correctly", async () => {
        const mockAlert = {
            id: "123",
            type: "ALERT",
            alertToken: 1,
            alertStat: "price",
            alertThreshold: 100,
            alertDirection: "<",
            alertDisabled: 0
        } as UserSetting;
        await genSqlInsertCommand(mockAlert, "user_settings", new UserSetting());
        jest.spyOn(AlertsInteractionProcessor, "parseSelected").mockReturnValueOnce(Promise.resolve([mockAlert]));
        await AlertsInteractionProcessor.processButton({
            data: {
                custom_id: "alerts_edit_123"
            },
            user: {id: "123"}
        } as any, mockReply);
        expect(msg.mock.calls[0][0].data.title).toBe("Editing alert for Bitcoin");
        await AlertsInteractionProcessor.processModal({
            data: {
                custom_id: "alerts_editmodal_123",
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 3,
                                custom_id: "alerts_editmodalstat_123",
                                value: "24h%"
                            }
                        ]
                    },
                    {
                        type: 1,
                        components: [
                            {
                                type: 3,
                                custom_id: "alerts_editmodalvalue_123",
                                value: ">1"
                            }
                        ]
                    }
                ]
            },
            message: {
                embeds: [
                    {
                        description: "- ✅ When price of Bitcoin is less than $100"
                    }
                ]
            },
            user: {id: "123"}
        } as any, mockReply);
        expect(await db.get("select * from user_settings where id = 123 and alertThreshold=100")).toBeUndefined();
        const newAlert = await db.get("select * from user_settings where id = 123 and alertThreshold=1");
        expect(newAlert).not.toBeUndefined();
        expect(newAlert.alertStat).toBe("24h%");
        expect(newAlert.alertDirection).toBe(">");
        expect(msg.mock.calls[2][0].type).toBe(4);
        expect(msg.mock.calls[2][0].data.content).toBe("Done! Edited alert for Bitcoin.");

    });
});