import React from 'react';
import styles from './Home.css';
import AppStyles from "../App.css"

export default function Home() {
    return (
        <div className={AppStyles.ContentWindow}>
            <h2>Hello, [Name]</h2>
        </div>
    );
}