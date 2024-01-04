import React, { useCallback, useRef, useState } from "react";

import classes from "./ToggleSwitch.css";

interface IProps {
    size?: number
    state: boolean
    onChange: (value: boolean)=>void
    disabled?: boolean
    formControlName?: string
}

export default function ToggleSwitch(props: IProps) {
    const [state, setState] = useState<boolean>(props.state);
    const isDragActive = useRef<boolean>(false);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const bulletRef = useRef<HTMLSpanElement>(null);
    const hasMoved = useRef<boolean>(false);

    const changeState = (newState: boolean)=> {
        if(newState!=state) {
            props.onChange(newState);
            setState(newState);
        }
    }

    const mouseDownAction = useCallback(()=>{
        if(!props.disabled) {
            isDragActive.current = true;
            hasMoved.current = false;
        }
       
    },[]);

    const mouseMoveAction = useCallback((e: React.MouseEvent)=>{
        if(isDragActive.current) {
            const style = getComputedStyle(bulletRef.current as HTMLSpanElement);

            const newPos = parseInt(style.left)+e.movementX;

            if(newPos>=0&&newPos <= (wrapperRef.current as HTMLDivElement).clientWidth - (bulletRef.current as HTMLSpanElement).clientWidth) {
                (bulletRef.current as HTMLSpanElement).style.transition = "none";
                (bulletRef.current as HTMLSpanElement).style.left = `${newPos}px`;
                hasMoved.current = true;
            }

        }
            
    },[]);

    const mouseUpAction = ()=>{
        if(isDragActive.current) {
            isDragActive.current = false;
            const style = getComputedStyle(bulletRef.current as HTMLSpanElement);

            if(parseInt(style.left) > (wrapperRef.current as HTMLDivElement).clientWidth / 4) {
                changeState(true);
            }else changeState(false);

            (bulletRef.current as HTMLSpanElement).style.left = "";
        }
      
    }

    const mouseClickAction = ()=>{
        if(!isDragActive.current&&!hasMoved.current&&!props.disabled) {
            (bulletRef.current as HTMLSpanElement).style.transition = "";
            changeState(!state);
        }
        hasMoved.current = false;
    }

    return (
        <div ref={wrapperRef} className={`${classes.ToggleSwitch} ${props.disabled?classes.Disabled:""}`} style={{width: `${props.size ?? 45}px`}}onClick={mouseClickAction} >
            <input type="checkbox" title={props.formControlName} checked={state} readOnly name={props.formControlName}/>
            <span ref={bulletRef} className={`${classes.Bullet} ${state?classes.Active:""}`} onMouseDown={mouseDownAction} onMouseMove={mouseMoveAction} onMouseUp={mouseUpAction} onMouseLeave={mouseUpAction}></span>
        </div>
    )
}