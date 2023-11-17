import React from "react";
import { Link } from "react-router-dom";
import styles from "./NoPage.css";

export default function NoPage(){
    return (
        <section className={styles.FlexContainer}>
            <img src="/ilustrations/ResourceNotFound.svg" alt="'404' Image" />
            <div className={styles.MessageHolder}>
                <h2>Page not found</h2>
                <p>Resource you are looking for doesn't exist under that address.</p>
                <Link to="/" className="button">Take me home</Link>
            </div>
        </section>
    );
}