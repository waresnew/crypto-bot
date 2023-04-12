import alertsCmd from "../commands/myalerts";
import {mockCommandInteraction, mockReply} from "./testSetup";
import Mock = jest.Mock;

describe("Test /alert ui", () => {
    const msg = mockReply.send as Mock<any, any, any>;
    it("displays embed correctly", async () => {
        await alertsCmd.execute(mockCommandInteraction, mockReply);
        expect(msg.mock.calls[0][0].data.embeds[0].title).toBe("Your alerts");
        expect(msg.mock.calls[0][0].data.embeds[0].description).toMatch(new RegExp("Looking.+\\nToggle/delete your crypto notifications here.+\\n\\nYou currently have no selected alerts"));
        expect(msg.mock.calls[0][0].data.components[0].components[0].options[0].label).toBe("You have no alerts.");
        expect(msg.mock.calls[0][0].data.components[1].components[0].label).toBe("Enable selected");
        expect(msg.mock.calls[0][0].data.components[1].components[1].label).toBe("Disable selected");
        expect(msg.mock.calls[0][0].data.components[1].components[2].label).toBe("Delete selected");
    });
});