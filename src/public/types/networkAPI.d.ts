
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

            type TResponse = API._.ISuccessGetResponse<IResponseData> | API._.IFailureGetResponse<TCommonResponses | "NotSignedIn">
        }

        namespace NavMenu {
            
            interface IResponseData {
                displayName: string
                linkDest: string
                imageName: string
                imageAlt: string
            }

            type TResponse = API._.ISuccessGetResponse<IResponseData[]> | API._.IFailureGetResponse<TCommonResponses | "NotSignedIn">
        }

        namespace Schedule {
            namespace GetSchedule {

                interface IRequest {
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

                type TResponse = API._.ISuccessGetResponse<IResponseData> | API._.IFailureGetResponse<TCommonResponses | "NotSignedIn" | "InvalidDate">
            }
        }

        namespace Statistics {
            namespace GetStatistics {
                interface IRequest {
                    fromMonth?: string
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
                }

                interface IResponseData {
                    stats: IUserStats,
                    goal: IGoalDetails
                }

                type TResponse = API._.ISuccessGetResponse<IResponseData> | API._.IFailureGetResponse<TCommonResponses | "NotSignedIn" | "InvalidDate">
            }
        }
    }
}