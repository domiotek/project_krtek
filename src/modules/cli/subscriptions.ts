import Output from "../output.js";

export async function initializeSubscriptions() {
    const app = global.app;
    if(!app) {
        Output.category("debug").print("error",new Error("Can't initialize subscriptions before the environment is ready."));
        return;
    }

    const files = await global.app.fs.local().listDirectory("modules/cli/subscriptions");
    if(files) {
        for (const file of files) {
            try {
                const parts = file.split(".");
                const extension = parts[parts.length - 1];
                const name = file.substring(0,file.length-(extension.length+1));
                if(extension=="js"){
                    const subscription = app.server?.socketServer.subscriptions.define(name);
                    if(subscription) {
                        subscription.state(app.env.subscriptionServices[name]);
                        (await import(`./subscriptions/${file}`)).default(subscription);
                    }
                }
            }catch(error) {
                Output.category("debug").print("error",new Error(`[Subscription services] Couldn't load subscription service from '${file}' file. ${error}`));
            }
        }
    }
}