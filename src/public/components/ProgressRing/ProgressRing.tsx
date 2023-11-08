import React from "react";


interface IProps {
    radius: number
    stroke: number
    progress: number
}

export default function ProgressRing(props: IProps) {
    const normalizedRadius = props.radius - props.stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
  
    const strokeDashoffset = circumference - props.progress / 100 * circumference;

    return (
        <svg
          height={props.radius * 2}
          width={props.radius * 2}
         >
          <circle
            stroke="#4166DC"
            fill="transparent"
            strokeWidth={ props.stroke }
            strokeDasharray={ circumference + ' ' + circumference }
            style={ { strokeDashoffset, transform: "rotate(-90deg)", transformOrigin: "50% 50%" } }
            r={ normalizedRadius }
            cx={ props.radius }
            cy={ props.radius }
           />
        </svg>
    );
}