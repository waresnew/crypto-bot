import {Alert} from "./alert";
import {gasPrices} from "../../services/etherscanRest";

//eth only
export class GasAlert extends Alert {
    //slow, normal, fast
    speed:string;
    threshold:number;

    override async format() {
        return `When gas for a ${this.speed} transaction is ${this.threshold} gwei`;
    }

    override async shouldTrigger() {
        if (!await super.shouldTrigger()) {
            return false;
        }
        return gasPrices[this.speed] <= this.threshold;
    }

}