import React, { useEffect, useState } from "react";

import classes from "./PasswordStrengthIndicator.css";


interface IProps {
    password: string
    validator: (newState: boolean)=>void
}

export default function PasswordStrengthIndicator(props: IProps) {
    const [isLongEnough, setIsLongEnough] = useState(false);
    const [hasULetter, setHasULetter] = useState(false);
    const [hasLLetter, setHasLLetter] = useState(false);
    const [hasDigit, setHasDigit] = useState(false);
    const [hasSymbol, setHasSymbol] = useState(false);
    
    useEffect(()=>{
        const _isLongEnough = props.password.length>=8;
        const _hasULetter = /(?=.*[A-Z])/.test(props.password);
        const _hasLLetter = /(?=.*[a-z])/.test(props.password);
        const _hasDigit = /(?=.*\d)/.test(props.password);
        const _hasSymbol = /((?=.*\W)|(?=.*_))/.test(props.password);

        setIsLongEnough(_isLongEnough);
        setHasULetter(_hasULetter);
        setHasLLetter(_hasLLetter);
        setHasDigit(_hasDigit);
        setHasSymbol(_hasSymbol);

        props.validator(_isLongEnough&&_hasULetter&&_hasLLetter&&_hasDigit&&_hasSymbol);
    
    },[props.password]);

    return (
        <ul className={classes.PasswordStrengthIndicator}>
            <li className={isLongEnough?classes.PassedRequirement:""}>
                Is at least 8 charactes long
            </li>
            <li className={hasULetter?classes.PassedRequirement:""}>
                Has one uppercase letter
            </li>
            <li className={hasSymbol?classes.PassedRequirement:""}>
                Has one special character
            </li>
            <li className={hasLLetter?classes.PassedRequirement:""}>
                Has one lowercase letter
            </li>
            <li className={hasDigit?classes.PassedRequirement:""}>
                Has one numeric character
            </li>
        </ul>
    );
}