import * as yup from "yup";

const IRequestInitRequest = yup.object().shape({
    command: yup.string().required(),
    params: yup.array(yup.string().required()).required()
});

const IRequestStateRequest = yup.object().shape({
    requestID: yup.number().required().moreThan(0)
});

export {IRequestInitRequest, IRequestStateRequest};