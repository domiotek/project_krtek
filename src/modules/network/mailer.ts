import NodeMailer from "nodemailer";
import Mailtrap from "mailtrap";

import Output from "../output.js";

type TTransportType<T extends "production" | "development"> = T extends "production"?Mailtrap.MailtrapClient:NodeMailer.Transporter; 


export default class Mailer implements Mailer.IMailer {
    private readonly _client: Mailtrap.MailtrapClient | undefined;
    private readonly _transport: NodeMailer.Transporter | undefined;
    private templates: Mailer.ITemplatesData;
    private configValidityRejectFlag: boolean;
    private devTemplates: Mailer.IDevTemplates;

    private _senderList: Mailer.ISenderList;

    private _getTransport<T extends "production" | "development">(envType: T): TTransportType<T> {
        return envType=="production"?this._client:this._transport as any;
    }

    private _devTemplateFallback(templateID: string, variables: Mailer.IVariables): [string, string] {
        const templateString = this.devTemplates[templateID];
        let subject: string = "[Development Stage Email] ";
        let body: string = "\nThis is a email send from the development, testing server. This shouldn't reach production. If you see it on a publicly deployed website, that means I messed up the environment configuration."

        if(templateString) {
            const parts = templateString.split(";:");
            subject = subject + parts[0];
            body = parts[1] + body;
            
            for (const variable of Object.getOwnPropertyNames(variables)) {
                body = body.replace(`[${variable}]`,variables[variable].toString());
            }
        }else {
            subject = subject + "This mail won't make sense";
            body = `There is no template with the supplied ID (Check out the logs) or it doesn't have devFallbackTemplate defined. ` + body;
        }
        return [subject, body];
    }

    /**
     * Manages the process of sending emails using Mailtrap API. 
     * It uses two transporters, depending on the environment configuration.
     * In production is uses official Mailtrap API client with the support of templates, but
     * in development, because Mailtrap's client doesn't support testing APi, it fallbacks into
     * the native Nodemailer implementation and uses dev templates, which are basic text oriented messages.
     * @param envMode Environment configuration name. Normally either "production" or "development"
     * @param config Mailtrap configuration. For seamless usage, please include both environment' configs.
     */
    constructor(envMode: string, config: IEnvironmentConfig["externalServices"]["Mailtrap"]) {

        if(envMode=="production") {
            this._client = new Mailtrap.MailtrapClient({
                token: config?.production?.token ?? "",
                endpoint: config?.production?.endpoint
            });
        }else {
            this._transport = NodeMailer.createTransport({
                host: config?.development?.host,
                port: config?.development?.port,
                auth: config?.development?.auth
            });
        }

        this.templates = {};
        this.devTemplates = {};
        this._senderList = config?.senderList ?? {};

        this.configValidityRejectFlag = false;
        
    }

    public async loadTemplates() {
        const templateFiles = await global.app.fs.local().listDirectory("modules/network/email-templates");

        if(templateFiles) {
            this.templates = {};
            for(const fileName of templateFiles) {
                if(fileName.endsWith(".js")) {
                    Output.category("debug").print("notice",`Loading email template from ${fileName} file.`,"mailer");

                    const templateData: Mailer.ITemplateDetails = (await import(`./email-templates/${fileName}`)).default;
                    this.templates[templateData.friendlyName] = {
                        ID: templateData.ID,
                        variablesValidator: templateData.variablesValidator
                    }

                    if(global.app.env.environmentName!="production") {
                        this.devTemplates[templateData.ID] = templateData.devFallbackTemplate;
                    } 
                }
            }
        } 
    }

    public testConfiguration(): Promise<boolean> {
        if(global.app.env.environmentName=="production") return new Promise<true>(res=>res(true));
        else return new Promise(res=>{
            this._getTransport("development").verify(err=>{
                if(err) {
                    Output.category("debug").print("warning","[Mailer] Invalid configuration settings for mailtrap configuration. Email sending will be unavailable.");
                    res(false);
                    this.configValidityRejectFlag = true;
                }
                res(true);
            });
        });
    }

    public getTemplate(templateName: string): Mailer.ITemplate | undefined {
        return this.templates[templateName];
    }

    public async send(sender: Mailer.ISenderDetails, to: string, template: Mailer.ITemplate, variables: Mailer.IVariables): Promise<boolean> {
        if(this.configValidityRejectFlag) {
            Output.category("debug").print("notice","[Mailer] Rejecting mail send request, because of invalid config. Attempt won't be made.");
            return false;
        }

        try {
            await template.variablesValidator.validate(variables);
        } catch (error: any) {
            Output.category("debug").print("notice",`[Mailer] Rejecting mail send request because of invalid or missing variables provided for the requested templated. Validity check error: ${error.message}`);
            return false;
        }


        return await new Promise(resolve=>{
            
            const resultHandler = (err: Error | null, info: any)=>{
                if(err) {
                    Output.category("debug").print("error",err).print("notice",`[Mailer] Mail sending failed because of the error above.`);
                    resolve(false);
                    return;
                }else {
                    Output.category("debug").print("notice",`[Mailer] Sent an email with ${template.ID} template.`,"mailer");
                    resolve(info?.accepted?.length===1);
                }
            }

            if(global.app.env.environmentName!="production") {
                const [subject, body] = this._devTemplateFallback(template.ID, variables);

                if(!global.app.env.flags.suppressEmailSending) 
                    this._getTransport("development").sendMail({
                        subject,
                        text: body,
                        from: {
                            address: sender.email,
                            name: sender.displayName
                        },
                        to
                    }, resultHandler);
                else {
                    Output.category("debug").print("notice","[Mailer] Email suppression is enabled - emails won't be sent. This email was suppoused to be sent though.","mailer")
                    .print("notice",`Subject: "${subject}"; Body: "${body}"`,"mailer");
                    resolve(true);
                }

            }else if(!global.app.env.flags.suppressEmailSending) {
                this._getTransport("production").send({
                    from: {
                        email: sender.email,
                        name: sender.displayName
                    },
                    to: [
                        {email: to}
                    ],
                    template_uuid: template.ID,
                    template_variables: variables
                }).then(res=>{resolve(true)}).catch(err=>resolve(false));
            }else {
                Output.category("debug").print("notice","[Mailer] Email suppression is enabled - emails won't be sent. This email was suppoused to be sent though.","mailer")
                    .print("notice",`Template ID: "${template.ID}" with variables: "${JSON.stringify(variables)}"`,"mailer");
                resolve(true);
            }
        });
    }

    getSender(senderName: string): Mailer.ISenderDetails | null {
        return this._senderList[senderName] ?? null;
    }
}