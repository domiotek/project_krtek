import * as yup from "yup";

export default {
    friendlyName: "RegistrationInvitation",
    ID: "e35060ab-4c1b-4838-9301-82593aab04c9",
    variablesValidator: yup.object().required().shape({
        invitation_link: yup.string().required()
    }),
    devFallbackTemplate: `Invitation link;:Hi, Here is your invitation link: [invitation_link].`
}