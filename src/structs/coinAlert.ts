// @ts-ignore
import mongoose, {HydratedDocument, InferSchemaType, Schema} from "mongoose";

const schema = new Schema({
    user: {type: String, required: true},
    coin: {type: Number, required: true},
    stat: {type: String, required: true, maxLength: 10},
    threshold: {type: Number, required: true, min: -1000000000, max: 1000000000},
    direction: {type: String, required: true, enum: [">", "<"]},
    disabled: {type: Boolean, default: false}
});
export const CoinAlertModel = mongoose.model("CoinAlert", schema);
export type CoinAlert = HydratedDocument<InferSchemaType<typeof schema>>;