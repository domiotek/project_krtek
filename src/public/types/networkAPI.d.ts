
export namespace WebApp {
    interface IAccountDetails {
        accountName: string
        accountRole: string
        accountImage: string
    }

    type TSetModalContent = (newModalContent: JSX.Element | null)=>void

    type TAppOutletContext = [IAccountDetails, TSetModalContent];
}


export namespace API {

    interface IBaseAPIEndpoint {
        method: "GET" | "POST" | "PUT" | "DELETE"
        url: string
        returnData: any
        errCodes: TCommonResponses | string
        returnPacket: API._.ISuccessGetResponse<this["returnData"]> | API._.IFailureGetResponse<this["errCodes"]>
        urlParams: {[param: string]: string} | null
    }

    type TBuildAPIEndpoint<M extends "GET" | "POST" | "PUT" | "DELETE", U extends string, R, E extends string = TCommonResponses, P extends {[p: string]: string} | null = null> = {
        method: M
        url: U
        returnData: R
        errCodes: TCommonResponses | E
        returnPacket: API._.ISuccessGetResponse<R> | API._.IFailureGetResponse<TCommonResponses | E>
        urlParams: P
    }

    namespace _ {
        interface ISuccessGetResponse<T> {
            status: "Success",
            data: T
        }

        interface IFailureGetResponse<T> {
            status: "Failure",
            message?: string
            errCode: T
        }
    }

    interface IGenericPOSTResponse {
        status: "Success" | "Failure"
        errCode?: "InternalError" | "BadRequest" | string
        message?: string
    }

    interface IGenericGETResponse {
        status: "Success" | "Failure"
        errCode?: "InternalError" | "BadRequest" | string
        data?: any
    }

    type TCommonResponses = "InternalError" | "BadRequest" | "DBError" | "NoConnection";

    namespace Auth {
        namespace SignUp {
            interface IRequest {
                token: string
                username: string
                password: string
                name: string
                surname: string
                gender: string
            }

            interface IResponse extends IGenericPOSTResponse {
                errCode?: TCommonResponses | "InvalidToken" | "InvalidEmail" | "InvalidPassword" | "UserExists";
            }
        }

        namespace SignIn {
            interface IResponse extends IGenericPOSTResponse {
                errCode?: TCommonResponses | "InvalidCredentials";
            }

            interface IRequest {
                username: string
                password: string
                /**
                 * Can be safely use as it was "false" | "true" type.
                 * Is runtime checked.
                 */
                rememberMe: string
            }
        }

        namespace SignOut {
            interface IRequest {
                redr?: number
            }
        }

        namespace ChangePassword {
            interface IRequest {
                token?: string
                password?: string
            }

            interface IResponse extends IGenericPOSTResponse {
                errCode?:  TCommonResponses | "InvalidToken" | "InvalidPassword" | "NoUser"
            }
        }

        namespace RecoverPassword {
            interface IRequest {
                username: string
            }

            interface IResponse extends IGenericPOSTResponse {
                errCode?: TCommonResponses | "MailerError" | "Other"
            }
        }

        namespace GetEmailFromToken {
            interface IRequest {
                token: string
                type: string
            }

            interface IResponse extends IGenericPOSTResponse {
                errCode?: TCommonResponses | "InvalidToken";
                email?: string
            }
        }
    }

    namespace App {

        namespace BasicData {
            interface IResponseData {
                name: string
                surname: string
                rankName: string
            }

            type IEndpoint = TBuildAPIEndpoint<"GET", "/api/user/basic-data", IResponseData, "NotSignedIn">
        }

        namespace NavMenu {
            
            interface IResponseData {
                displayName: string
                linkDest: string
                imageName: string
                imageAlt: string
            }

            type IEndpoint = TBuildAPIEndpoint<"GET", "/api/user/nav-menu",IResponseData[], "NotSignedIn">
        }

        namespace Schedule {
            namespace GetSchedule {

                interface IURLParams {
                    [p: string]: string
                    withDay: string
                }

                interface IResponseData {
                    rangeStart: string
                    rangeEnd: string
                    workDays: Array<{
                        ID: number
                        date: string
                        slots:  Array<{
                            ID: number
                            requiredRole: string
                            employeeName: string | null
                            startTime: string
                            endTime: string | null
                        }>
                    }>
                }

                type IEndpoint = TBuildAPIEndpoint<"GET", "/api/schedule/:withDay",IResponseData, "NotSignedIn" | "InvalidDate", IURLParams>
            }
        }

        namespace Statistics {
                }

                interface IGoalDetails {
                    milestones: IMilestone[]
                    totalAmount: number
                }

                interface IMilestone {
                    ID: string
                    title: string
                    amount: number
                    orderTag: number
                }

                interface IUserStats {
                    totalHours: number
                        shiftCount: number
                        wagePerHour: number | null
                        totalWage: number | null
                        totalTip: number
                        totalDeduction: number
                        maxTip: number
                        minTip: number
                        avgTip: number
                        externalIncome: number
            namespace GetStatistics {
                interface IURLParams {
                    [p: string]: string
                    ofMonth: string
                }

                interface IResponseData {
                    stats: IUserStats,
                    goal: IGoalDetails
                }

                type IEndpoint = TBuildAPIEndpoint<"GET","/api/app/statistics/:ofMonth",IResponseData, "NotSignedIn" | "InvalidDate", IURLParams>
            }
        }
    }
}