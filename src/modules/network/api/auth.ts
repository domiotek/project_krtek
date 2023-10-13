import Output from "../../output.js";
import { RouteOptions } from "fastify/types/route.js";
import { now } from "../../time.js";
import { FastifyError, FastifyRequest } from "fastify";
import { API } from "../../../public/types/networkAPI.js";
import * as yup from "yup";

const errorHandler = async (err:FastifyError, req: FastifyRequest)=> {
    Output.category("debug").print("notice",`[API][Auth] "${req.method}:${req.url}" request failed with "${err.statusCode}" code. Reason: "${err.message}".`,"webapi");

    return {
        status: "Failure",
        errCode: "InternalError",
        message: "Uncaughted Internal Server Error."
    }
}

const signUpRouteRequestSchema = yup.object().shape({
    token: yup.string().required(),
    username: yup.string().required(),
    password: yup.string().required().matches(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])((?=.*\W)|(?=.*_))^[^ ]+$/),
    name: yup.string().required(),
    surname: yup.string().required(),
    gender: yup.string().required().oneOf(["m","f","o"])
});

const signUpRoute: RouteOptions = {
    method: "POST",
    url: "/auth/signup",
    handler: async (req, res)=>{
        res.header("cache-control","no-store");
        const authManager = global.app.webAuthManager;

        let result: API.Auth.SignUp.IResponse = {
            status: "Failure"
        }

        let params: API.Auth.SignUp.IRequest;

        try {
            params = await signUpRouteRequestSchema.validate(req.body);
        } catch (error) {
            result.errCode="BadRequest";
            result.message = (error as yup.ValidationError).message;
            return result;
        }

        if(params.token) {
            const inviteDetails = await authManager.getInviteDetails(params.token);

            if(inviteDetails.result=="Success") {

                const registrationData: WebAPI.Auth.UserAPI.IUserRegistrationData = {
                    email: inviteDetails.data.email,
                    password: params.password,
                    name: params.name,
                    surname: params.surname,
                    gender: params.gender
                } 

                const response = await authManager.createUser(registrationData);

                if(response===true) {
                    result = {
                        status: "Success"
                    }
                    authManager.dropInvite(params.token);
                }else result.errCode = response;
            }else result.errCode = inviteDetails.result;
        }else {
            result.errCode = "InvalidToken";
            result.message = "No token given.";
        }

        return result;
    },
    errorHandler
}


const signInRouteRequestSchema = yup.object().shape({
    username: yup.string().required().email(),
    password: yup.string().required(),
    rememberMe: yup.string().oneOf(["false","true"]).required()
});

const signInRoute: RouteOptions = {
    method: "POST",
    url: "/auth/signin",
    handler: async (req, res)=>{
        res.header("cache-control","no-store");
        const authManager = global.app.webAuthManager;

        const result: API.Auth.SignIn.IResponse = {
            status: "Success"
        }

        let params: API.Auth.SignIn.IRequest;

        try {
            params = await signInRouteRequestSchema.validate(req.body)
        } catch (error) {
            result.status = "Failure";
            result.errCode = "BadRequest";
            result.message = (error as yup.ValidationError).message;
            return result;
        }

        if(req.cookies.session !== undefined) {
            if(await authManager.isSessionValid(req.cookies.session)) {
                result.message = "User already signed in."
                return result;
            }
        }

        const usePersistentSession = params.rememberMe==="true";

        const loginResult = await authManager.tryLogin(params.username ?? "",params.password ?? "",req.ip);

        if(loginResult.result=="Success") {
            res.setCookie("session",loginResult.data,{path:"/",expires: usePersistentSession?now().plus({days: 7}).toJSDate():undefined});
            return result;
        }else { 
            result.status = "Failure";
            result.errCode = loginResult.result
            return result;
        }
    },
    errorHandler
}

const signOutRouteRequestSchema = yup.object().shape({
    redr: yup.number().oneOf([0,1])
});

const signOutRoute: RouteOptions =  {
    method: "GET",
    url: "/auth/signout",
    handler: async (req, res)=>{
        res.header("cache-control","no-store");
        const authManager = global.app.webAuthManager;
        let params: API.Auth.SignOut.IRequest;

        try {
            params = await signOutRouteRequestSchema.validate(req.query);
        } catch (error) {

            let result: API.IGenericPOSTResponse =  {
                status: "Failure",
                errCode: "BadRequest",
                message: (error as yup.ValidationError).message
            }

            return result;
        }

        if(req.cookies.session !== undefined) {
            if(await authManager.isSessionValid(req.cookies.session)) {
                await authManager.dropSession(req.cookies.session);
                res.clearCookie("session");
            }
        }

        if(params.redr==0) {
            return {status: "Success"};
        }else res.redirect(302,"/login?r=logout");
    },
    errorHandler: (err, req, res)=>{
        Output.category("debug").print("error",new Error(`[API][AUTH] Request error on signout route. Message: ${err.message}`));
        res.redirect(302,"/login");
    }
}

const recoverAccountRouteRequestSchema = yup.object().shape({
    username: yup.string().required().email()
});
const recoverAccountRoute: RouteOptions = {
    method: "POST",
    url: "/auth/recover",
    handler: async (req, res)=>{
        res.header("cache-control","no-store");
        const mailer = global.app.mailer;
        const authManager = global.app.webAuthManager;
        const result: API.Auth.RecoverPassword.IResponse = {
            status: "Failure"
        }

        let params:  API.Auth.RecoverPassword.IRequest;

        try {
            params = await recoverAccountRouteRequestSchema.validate(req.body);
        } catch (error) {
            result.status = "Failure";
            result.errCode = "BadRequest";
            result.message = (error as yup.ValidationError).message;
            return result;
        }
        
        if(params.username) {
            const token = await authManager.createToken("ChangePassword",params.username);

            if(token.result=="Success") {
                const user = await authManager.getUser(params.username);

                if(user.result=="Success") {
                    const template = mailer.getTemplate("PasswordRecovery");
                    const sender = mailer.getSender("aas");
    
                    if(template&&sender) {
                        const sendResult = await mailer.send(sender, params.username,template, {name: user.data.name, email_address: params.username, reset_link: `http://127.0.0.1:3000/p/ResetPassword?token=${token.data}`});
                        if(sendResult) {
                            result.status="Success";
                        }
                    }else {
                        result.errCode="MailerError";
                        result.message="No such template or sender.";
                    }
                }else result.errCode="Other";
            }else {
                switch(token.result) {
                    case "NoConnection": result.errCode="NoConnection"; break;
                    case "NoUser": result.status="Success"; break; //Covering the fact, that given email doesn't match any account
                    case "TooMuchTokens": result.errCode="Other"; break;
                    default: 
                        result.errCode="DBError";
                }
            }
        }else {
            result.errCode="Other";
            result.message="Missing parameter.";
        }

        return result;
    },
    errorHandler
}

const setPasswordRouteRequestSchema = yup.object().shape({
    token: yup.string().required(),
    password: yup.string().required().matches(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])((?=.*\W)|(?=.*_))^[^ ]+$/)
});
const setPasswordRoute: RouteOptions = {
    method: "POST",
    url: "/auth/change/password",
    handler: async (req, res)=>{
        res.header("cache-control","no-store");
        const authManager = global.app.webAuthManager;
        const result: API.Auth.ChangePassword.IResponse = {
            status: "Failure"
        }
        
        let params: API.Auth.ChangePassword.IRequest;

        try {
            params = await setPasswordRouteRequestSchema.validate(req.body);
        } catch (error) {
            result.status = "Failure";
            result.errCode = "BadRequest";
            result.message = (error as yup.ValidationError).message;
            return result;
        }

        if(!params.token || !params.password) {
            result.errCode="InvalidToken";
            return result;
        }

        const tokenResult = await authManager.getTokenDetails(params.token);

        if(tokenResult.result=="Success") {
            const token = tokenResult.data as WebAPI.Auth.AccountsTokenAPI.ITokenDetails;

            const response = await authManager.setPassword(token.userID,params.password);

            if(response===true) {
                result.status = "Success";
                authManager.dropToken(params.token);
            }else result.errCode = response;
            
        }else result.errCode=tokenResult.result;

        return result;
    },
    errorHandler
}

const getEmailFromTokenRequestSchema = yup.object().shape({
    token: yup.string().required(),
    type: yup.string().required().oneOf(["action","invite"])
});
const getEmailFromToken: RouteOptions = {
    url: "/auth/GetEmailFromToken",
    method: "GET",
    handler: async (req, res)=>{
        res.header("cache-control","no-store");
        let params: API.Auth.GetEmailFromToken.IRequest;
        const result: API.Auth.GetEmailFromToken.IResponse = {
            status: "Failure"
        }

        try {
            params = await getEmailFromTokenRequestSchema.validate(req.query);
        } catch (error) {
            result.status = "Failure";
            result.errCode = "BadRequest";
            result.message = (error as yup.ValidationError).message;
            return result;
        }

        if(params.type=="invite") {
            const response = await global.app.webAuthManager.getInviteDetails(params.token);
            if(response.result=="Success") {
                result.status="Success";
                result.email=response.data.email;
            }else result.errCode = response.result;
        }else {
            const response = await global.app.webAuthManager.getTokenDetails(params.token);

            if(response.result=="Success") {
                const user = await global.app.webAuthManager.getUser(response.data.userID);
                if(user.result=="Success") {
                    result.status="Success";
                    result.email=user.data.email;
                }else if(user.result=="NoUser") result.errCode = "InvalidToken";
                else result.errCode = user.result;
            }else result.errCode = response.result;
        }
        

        return result;
    },
    errorHandler
}


export default [
    signUpRoute,
    signInRoute,
    signOutRoute,
    setPasswordRoute,
    recoverAccountRoute,
    getEmailFromToken
]