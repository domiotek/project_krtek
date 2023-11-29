import React, { useState } from "react";

import classes from "./FilterBox.css";

type TRule<T extends string = string> = {
    name: string
    values: Array<[T, string]>
}

interface IBase {
    [name: string]: TRule
}

type IFilterRules< K extends string=string, T extends IBase={}> = {
    [k in K]: TRule<T[k]["values"][0][0]>
}

type IFilterState<T extends IFilterRules> = {
    [key in keyof T]: Set<T[key]["values"][0][0]>
}

interface IProps<T extends IBase, K extends string> {
    rules: IFilterRules<K, T>
    state: IFilterState<IFilterRules<K,T>>
    setState: (newState: IFilterState<IFilterRules<K,T>>)=>void
}


export default function FilterBox<T extends IBase = IBase, K extends string = string>(props: IProps<T, K>) {
    const [changesMade, setChangesMade] = useState<boolean>(false);
    const [workingState, setWorkingState] = useState<IProps<T,K>["state"] | null>(null);

    function renderFilter(ID: string, filter: TRule<string>) {

        function valueClickHandler(this: string) {
            setChangesMade(true);

            const source = changesMade?workingState:props.state;

            // @ts-expect-error
            const state = new Set(source[ID] as Set<string>);

            if(state.has(this)) state.delete(this);
            else state.add(this);

            const stateCopy = Object.assign({},source);

            //@ts-expect-error
            stateCopy[ID] = state;

            setWorkingState(Object.assign({},stateCopy));
        }

        function renderValueSwitches() {
            const result = [];

            // @ts-expect-error
            const state = changesMade?workingState[ID] as NonNullable<Set<string>>:props.state[ID] as Set<string>;

            for (const [valueID, displayName] of filter.values) {
                result.push(
                    <span key={valueID} className={state.has(valueID)?classes.Active:""} onClick={valueClickHandler.bind(valueID)}>{displayName}</span>
                )
            }

            return result;
        }

        if(filter.values.length>0) {
            return (
                <div key={ID} className={classes.FilterSection}>
                    <h3>{filter.name}</h3>
                    <div className={classes.FilterList}>
                        {renderValueSwitches()}
                    </div>
                </div>
            );
        }
        
    }

    function renderFilters() {
        const result = [];

        for (const ruleName in props.rules) {
            result.push(renderFilter(ruleName, props.rules[ruleName]));
        }

        return result;
    }

    function applyClickHandler() {
        if(changesMade&&workingState) {
            props.setState(workingState);
            resetClickHandler();
        }
    }

    function resetClickHandler() {
        setChangesMade(false);
        setWorkingState(null);
    }

    function clearClickHandler() {
        const result = Object.assign({},props.state);

        for (const key in result) {
            result[key] = new Set
        }

        setWorkingState(result);
        setChangesMade(true);
    }

    return (
        <div className={classes.Wrapper}>
            <h2>
                Filters
                <button className={classes.ClearAllButton} onClick={clearClickHandler}>Clear all</button>
            </h2>
            {renderFilters()}
            <div className={classes.Buttons}>
                <button className={classes.ResetButton} onClick={resetClickHandler} disabled={!changesMade}>Reset</button>
                <button className={classes.ApplyButton} onClick={applyClickHandler} disabled={!changesMade}>Apply</button>
            </div>
        </div>
    );
}