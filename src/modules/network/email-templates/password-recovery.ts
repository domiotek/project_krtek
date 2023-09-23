import * as yup from "yup";

export default {
    friendlyName: "PasswordRecovery",
    ID: "7cccafc5-dd61-45f9-b690-687d9b0fa753",
    variablesValidator: yup.object().required().shape({
        name: yup.string().required(),
        email_address: yup.string().required(),
        reset_link: yup.string().required()
    }),
    devFallbackTemplate: `Password recovery link;:Hey [name], Here is your passwordReset link for [email_address]: [reset_link].`
}