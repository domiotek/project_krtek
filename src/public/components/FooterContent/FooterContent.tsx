import React from "react";
import { Link } from "react-router-dom";

export default function FooterContent() {
    return (
        <span>
            &copy; 2023 All rights reserved. <Link to="/Credits">Credits</Link>
        </span>
    );
}