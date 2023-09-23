import * as yup from "yup";

export const ClientVersion = yup.string().required().matches(/\d+\.\d+\.\d+/);

export const IReconnectionDetails = yup.object().shape({
    rejoinSubscriptions: yup.array().required()
});