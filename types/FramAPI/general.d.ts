namespace FramAPI {

    interface ITypedEventEmitter<EventNames, EventData> extends NodeJS.EventEmitter {

        /**
         * Triggers event. All registered listeners will be executed in the order they were added.
         */
        emit(event: EventNames, data: EventData): boolean;


        /**
         * Adds new event listener.
         */
        on(event: EventNames, listener: (data?: EventData) => void): this;

        addListener: this["on"];

        /**
         * Adds one-time event listener.
         */
        once(event: EventNames, listener: (data?: EventData)=> void): this;

        /**
         * Removes given event listener from listeners list.
         */
        off(event: EventNames, listener: (data?: EventData) => void): this;
        removeListener: this["off"];

        /**
         * Removes all listeners of given event. If event is not provided, all listeners will be removed
         */
        removeAllListeners(event?: EventNames): this;
        /**
         * Returns all registered listeners for specified event.
         */
        listeners(event: EventNames): Function[];

        rawListeners(event: EventNames): Function[];

        /**
         * Returns number of registered listeners for specified event.
         */
        listenerCount(event: EventNames): number;

        prependListener: this["on"];
        prependOnceListener: this["on"];
    }

    interface ICommandsHandlerUpdatedEventData {
        handler: CommandsExecutionCallback<Origin, Client, SubscriptionsInterface, ResponseCallback> | null
        sender: "HTTP" | "SOCKET"
    }
    
    type onCommandsHandlerUpdatedEventHandler = ((data: ICommandsHandlerUpdatedEventData)=>void) | null;
}