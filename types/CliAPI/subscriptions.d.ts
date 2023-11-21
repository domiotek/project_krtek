namespace CLIAPI {
    namespace Subscriptions {
        namespace OutputForwarder {
            interface IEventObjectTypeData {
                object: object
            }
    
            interface IEventTextTypeData {
                [colorsMode: string]: string
            }
            interface IPacket<Type = "text" | "object"> {
                type: Type
                data: Type extends "text"?IEventTextTypeData:IEventObjectTypeData,
                category: OutputCategory
            }
        }
    }
}