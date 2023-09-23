interface IParsedErrorData {
    /**
     * Error message.
     */
    message: string

    /**
     * Module, for example Class name where the error occurred.
     * Can be undefined if error occurred outside of any class.
     */
    faultingModule: string | undefined

    /**
     * Method name where the error occurred.
     * Can be undefined if error occurred outside of any method.
     */
    faultingMethod: string | undefined

    /**
     * Path to the file along with line and character position, where the error occurred.
     */
    faultLocation: string

    /**
     * Shortened stack.
     * * Paths have been shorthened, by making path relative to the dist directory.
     * * Entries originated in the internal node code have been deleted.
     */
    stack: string

    /**
     * Additional data attached to the error object on throw in form of JSON string.
     */
    attachedData: string | undefined
}

interface IGenericError extends Error {
    /**
     * Object with key'ed data.
     */
    data?: any
}