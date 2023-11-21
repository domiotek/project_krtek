import Output from "../../output.js";

let subscription : FramAPI.SocketServer.IInitSubscriptionInterface | undefined;

export default function initialize(service: FramAPI.SocketServer.IInitSubscriptionInterface) {
    subscription = service;
    subscription.manifest({
        supportedChannels: Output.outputCategories()
    });
}

function forwardPacket(packet: CLIAPI.Subscriptions.OutputForwarder.IPacket) {
    try {
        subscription?.broadcast("output", packet);
    }catch (error: any) {
        error.message = `Error while forwarding output. Error: ${error.message}.`;
        Output.category("debug").print("error",error);
    }
}

export function forwardText(channel: OutputCategory, data: {[colorsMode: string]: string}) {
    forwardPacket({
        type: "text",
        data,
        category: channel
    });
}

export function forwardObject(channel: OutputCategory, object: object) {
    forwardPacket({
        type: "object",
        data: {
            object
        },
        category: channel
    });
}