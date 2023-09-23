import * as yup from "yup";

const ISubscriptionStateRequest = yup.object().shape({
    subscriptionName: yup.string().required()
});

const ISubscriptionRegisterRequest = yup.object().shape({
    subscriptionName: yup.string().required()
});

const ISubscriptionUnregisterRequest = yup.object().shape({
    subscriptionName: yup.string().required()
});

export { ISubscriptionStateRequest, ISubscriptionRegisterRequest, ISubscriptionUnregisterRequest};