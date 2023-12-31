import { DateTime } from "luxon";

export namespace WebApp {
    interface IAccountDetails {
        accountName: string
        accountSurname: string
        accountRank: string
        accountImage: string
        accountGender: "m" | "f" | "o"
    }

    type TSetModalContent = (newModalContent: JSX.Element | null)=>void

    type TAppOutletContext = [IAccountDetails | null, TSetModalContent];
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

        namespace CommonEntities {
            interface IWorkdays {
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
        }

        namespace Version {
            interface IResponseData {
                version: string
                buildType: string
                buildDate: string
            }

            type IEndpoint = TBuildAPIEndpoint<"GET", "/api/app/version", IResponseData>
        }

        namespace BasicData {
            interface IResponseData {
                name: string
                surname: string
                rankName: string
                gender: "m" | "f" | "o"
            }

            type IEndpoint = TBuildAPIEndpoint<"GET", "/api/user/basic-data", IResponseData, "NotSignedIn">
        }

        namespace UserData {
            interface IResponseData {
                name: string
                surname: string
                rankName: string
                roles: string[]
                email: string
                gender: string
                lastPasswordChangeDate: string
                creationDate: string
            }

            type IEndpoint = TBuildAPIEndpoint<"GET", "/api/user/details", IResponseData, "NotSignedIn">
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

        namespace GetRoles {
            interface IRoleDetails {
                ID: number
                name: string
            }

            type IEndpoint = TBuildAPIEndpoint<"GET", "/api/app/roles", IRoleDetails[]>
        }

        namespace GetUserRoles {
            interface IRoleDetails {
                ID: number
                name: string
            }

            type IEndpoint = TBuildAPIEndpoint<"GET", "/api/user/roles", IRoleDetails[], "NotSignedIn">
        }

        namespace PostFeedback {
            interface IFeedbackData {
                type: "opinion" | "problem"
                title: string
                desc: string
                anonymity: boolean
            }

            type IEndpoint = TBuildAPIEndpoint<"POST", "/api/app/feedback", undefined, "NotSignedIn">
        }

        namespace Schedule {
            namespace GetSchedule {

                interface IURLParams {
                    [p: string]: string
                    withDay: string
                }

                type IEndpoint = TBuildAPIEndpoint<"GET", "/api/schedule/:withDay",CommonEntities.IWorkdays, "NotSignedIn" | "InvalidDate", IURLParams>
            }

            namespace UpdateShift {
                interface IRequestData {
                    startTime: string,
                    endTime: string,
                    tip: number,
                    deduction: number,
                    note: string | undefined
                    sharedNote: string | undefined
                }

                interface IURLParams {
                    [p: string]: string
                    when: string
                }

                interface IResponse extends IGenericPOSTResponse {
                    errCode?:  TCommonResponses | "NotSignedIn" | "InvalidDate" | "InvalidTime" | "NoSlot";
                }

                type IEndpoint = TBuildAPIEndpoint<"PUT","/api/schedule/shift/:when", undefined, "NotSignedIn" | "InvalidDate" | "InvalidTime" | "NoSlot" | "InvalidCurrency" | "InvalidDuration", IURLParams>
            }


            namespace UpdateShiftNotes {
                interface IRequest {
                    note: string | undefined
                    sharedNote: string | undefined
                }

                interface IURLParams {
                    [p: string]: string
                    when: string
                }

                type IEndpoint = TBuildAPIEndpoint<"PUT","/api/schedule/shift/:when/notes", undefined, "NotSignedIn" | "NoSlot" | "InvalidDate", IURLParams>
            }

            namespace UpdateShiftNote {
                interface IRequest {
                    data: string
                }

                interface IURLParams {
                    [p: string]: string
                    when: string
                    scope: "note" | "personal-note"
                }

                type IEndpoint = TBuildAPIEndpoint<"PUT","/api/schedule/shift/:when/:scope", undefined, "NotSignedIn" | "NoSlot" | "InvalidDate", IURLParams>
            }

            namespace AddShift {
                interface IRequest {
                    when: string
                    startTime: string
                    endTime: string
                    role: string
                }

                type IEndpoint = TBuildAPIEndpoint<"POST","/api/schedule/shift", undefined, "NotSignedIn" | "SlotExists" | "InvalidDate" | "InvalidTime" | "NotAllowed">
            }

            namespace GetWorkDay {
                interface IRequest {
                    date: string
                }

                interface IWorkDay {
                    note: string | null
                    noteUpdateTime: string | null
                    noteLastUpdater: string | null
                    date: string
                    personalSlot: IPersonalShiftSlot | null
                    otherSlots: {[privateID: number]: IShiftSlot | undefined}
                }

                interface IShiftSlot {
                    privateSlotID: number
                    status: "Unassigned" | "Assigned" | "Pending" | "Finished"
                    plannedStartTime: string
                    plannedEndTime: string | null
                    requiredRole: string
                    assignedShift: IShift | null
                }

                interface IPersonalShiftSlot extends IShiftSlot {
                    status: Exclude<IShiftSlot["status"],"Unassigned">
                    assignedShift: IPersonalShift
                }

                interface IShift {
                    startTime: string | null
                    endTime: string | null
                    userID: number
                    userName: string
                }

                interface IPersonalShift extends IShift {
                    tip: number | null,
                    deduction: number | null,
                    note: string | null,
                    noteUpdateTime: string | null
                }

                interface IResponse {
                    day: IWorkDay
                    wageRate: number | null
                }

                type IEndpoint = TBuildAPIEndpoint<"GET", "/api/schedule/workday/:date", IResponse, "NotSignedIn" | "InvalidDate",{date: string}>;
            }
        }

        namespace Statistics {
            interface IGoalDetails {
                milestones: IMilestone[]
                totalAmount: number
            }

            interface IMilestone {
                ID: number
                title: string
                amount: number
            }

            interface IBasicUserStats {
                totalHours: number
                shiftCount: number
                finishedShiftCount: number
                wagePerHour: number | null
                totalWage: number | null
                totalTip: number
                totalDeduction: number
                externalIncome: number | null
                totalEarnings: number
            }
            
            type ISafeUserStats = { [K in keyof IBasicUserStats]: NonNullable<IBasicUserStats[K]> };
            
            namespace UserShifts {
                interface IWorkDay<T extends "OnlyAssigned" | "All"> {
                    ID: number
                    note: string | null
                    noteUpdateTime: string | null
                    noteLastUpdater: string | null
                    date: string
                    slots: ISlots<T extends "OnlyAssigned"?IAssignedShiftSlot:IShiftSlot>
                }

                type ISlots<T extends IShiftSlot | IAssignedShiftSlot> =  {
                    [privateID: number]: T | undefined
                }

                interface IShiftSlot {
                    status: "Unassigned" | "Assigned" | "Pending" | "Finished"
                    plannedStartTime: string
                    plannedEndTime: string | null
                    requiredRole: string
                    assignedShift: IShift | null
                }

                interface IAssignedShiftSlot extends IShiftSlot {
                    assignedShift: IShift
                }

                interface IShift {
                    shiftID: number,
                    startTime: string | null,
                    endTime: string | null,
                    tip: number | null,
                    deduction: number | null,
                    userID: number,
                    userName: string
                    note: string | null
                }

               
            }

            interface IUserShifts {
                shifts: UserShifts.IWorkDay<"OnlyAssigned">[],
                userSlots: number[]
            }

            interface ICalculatedShiftData {
                duration: number
                wageEarnings: number
                tip: number
                deduction: number
                totalEarnings: number
                realWageRate: number
                startTime: DateTime
                endTime: DateTime | null
            }

            interface IParsedUserShifts extends IUserShifts {
                calcStats: ICalculatedShiftData[]
            }

            namespace GetStatistics {
                interface IURLParams {
                    [p: string]: string
                    ofMonth: string
                }

                interface IResponseData {
                    stats: IBasicUserStats,
                    goal: IGoalDetails | null
                    shifts: IUserShifts
                    historicGoal?: number | null
                }

                interface IParsedStats extends IResponseData {
                    shifts: IParsedUserShifts
                }

                type IEndpoint = TBuildAPIEndpoint<"GET","/api/app/statistics/:ofMonth",IResponseData, "NotSignedIn" | "InvalidDate", IURLParams>
            }

            namespace GetSettings {
                interface IResponseData {
                    maxMilestoneCount: number
                    goal: IGoalDetails | null
                    wageRate: number | null
                    externalIncome: number | null
                }

                type IEndpoint = TBuildAPIEndpoint<"GET", "/api/user/stats-settings", IResponseData, "NotSignedIn">
            }

            namespace PutSettings {

                interface IRequest {
                    props: {
                        wage: number
                        externalIncome: number
                    } | undefined
                    milestones: IMilestone[]
                    changedMilestonesCount: number
                    addedMilestonesCount: number
                    removedIDList: number[]
                    reorderedMilestones: boolean
                }

                type IEndpoint = TBuildAPIEndpoint<"PUT", "/api/user/stats-settings",undefined, "NotSignedIn">
            }
        }

        namespace Widgets {
            namespace GetUpcomingShifts {
                type IEndpoint = TBuildAPIEndpoint<"GET","/api/widgets/upcoming-shifts",Statistics.IUserShifts,"NotSignedIn">
            }

            namespace GetPendingShiftsCount {
                type IEndpoint = TBuildAPIEndpoint<"GET","/api/widgets/pending-shifts-count",number,"NotSignedIn">
            }

            namespace GetEarnings {
                interface IResponseData {
                    setGoal: number
                    totalEarnings: number | null
                }

                interface ISureData {
                    setGoal: number
                    totalEarnings: number
                }

                type IEndpoint = TBuildAPIEndpoint<"GET", "/api/widgets/earnings", IResponseData,"NotSignedIn">
            }

            namespace CurrentSchedule {

                type IEndpoint = TBuildAPIEndpoint<"GET", "/api/widgets/current-schedule", CommonEntities.IWorkdays, "NotSignedIn">
            }
        }
    }
}