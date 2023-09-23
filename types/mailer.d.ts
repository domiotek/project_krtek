
namespace Mailer {

    interface ISenderDetails {
        email: string
        displayName: string
    }


    interface ISenderList {
        [senderName: string]: ISenderDetails
    }

    type Validator = import("yup").AnyObjectSchema

    interface ITemplate {
        ID: string
        variablesValidator: Validator
    }

    interface ITemplatesData {
        [friendlyName: string]: ITemplate
    }

    interface ITemplateDetails {
        friendlyName: string
        ID: string
        variablesValidator: import("yup").ObjectSchema
        devFallbackTemplate: string
    }

    interface IVariables {
        [propertyName: string]: string | number
    }

    interface IDevTemplates {
        [templateName: string]: string
    }

    interface IMailer {

        /**
         * Tests given configuration.
         * Please note, that due to Mailtrap API limitation, only development configuration can be tested, 
         * while production configuration will be always reported as valid.
         * 
         * @async
         * @returns boolean
         */
        testConfiguration(): Promie<boolean>

        /**
         * Loads mail templates from files located in designated directory.
         * Because of limitations of Mailtrap API, development, test transporter doesn't support
         * templates, therefore, those files also includ basic dev template.
         */
        loadTemplates(): Promise<void>

        /**
         * Returns details of template with given friendly name.
         * Details include MailTrap's UUID for the template as well
         * as the validator object, that can be used to validate 
         * variables against template's schema.
         * @param templateName Friendly name. To find them, see src/modules/network/email-templates
         */
        getTemplate(templateName: string): ITemplate | undefined
        
        /**
         * Returns defined sender details, like email and full display name.
         * Please use this function to maintain consistency between all mail sending calls.
         * @param senderName short, coded sender name.
         */
        getSender(senderName: string): ISenderDetails | null

        /**
         * Sends email to recipient using either production or development transporter. 
         * @param sender Details about sender, like email and full display name. Please use Mailer::getSender for that.
         * @param to email address of the recipient 
         * @param template Template details. It's ignored when in development environment, because of the Mailtrap API limitations.
         * @param variables Template variables. Sending might fail if variables doesn't match template's variables schema, so make sure
         * to include all variables with correct types.
         */
        send(sender: ISenderDetails, to: string, template: ITemplate, variables: IVariables): Promise<boolean> 
    }
}