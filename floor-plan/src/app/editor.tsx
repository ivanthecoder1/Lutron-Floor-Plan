"use client";
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    User,
} from "firebase/auth";
import { useState, useEffect, useRef } from "react";
import "./editor.css";
import { auth, googleProvider } from "../../firebase";

// Needed for react-pdf to work
import { Document, Page, pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;


interface HomeProps {
    user: User | null;
    setUser: (user: User | null) => void;
}

export default function Editor({ user, setUser }: HomeProps) {
    // Store state of pdfFile
    const [pdfFile, setPdfFile] = useState<File | null>(null);

    // Sign out 
    const signOutWithGoogle = async () => {
        try {
            await signOut(auth);
            setUser(null);
        } catch (err) {
            console.error(err);
        }
    };

    // Checks file type and if it is a pdf
    const handleFileChange = (event: any) => {
        const file = event.target.files[0];
        if (file && file.type === "application/pdf") {
            setPdfFile(file);
        } else {
            alert("Please select a valid PDF file.");
        }
    };

    return (
        <main className="main">

            <nav className="navbar">
                <img
                    className="lutronLogo"
                    src="https://umslogin.lutron.com/Content/Dynamic/Default/Images/logo-lutron-blue.svg"
                    alt="Lutron-logo"
                />
                <h1 className="navbarBrand">Test Floor Plan #1 </h1>
                <ul className="navbarNav">
                    <li className="navbarItem">
                        <button className="button" onClick={() => signOutWithGoogle()}>Logout</button>
                    </li>
                </ul>
            </nav>

            {/* Put side tool bar over here, and make it appear to the left of the canvas box */}
            <div className="sideToolBar">
                <form>
                    <input type="file" onChange={handleFileChange} accept="application/pdf" />
                </form>
                <button>Export</button>
            </div>

            <div className="canvasBox">
                {/* Displays pdf*/}
                {/* Add feature to zoom in and zoom out of pdf */}
                {pdfFile && (
                    <Document file={URL.createObjectURL(pdfFile)}>
                        <Page pageNumber={1} renderAnnotationLayer={false} renderTextLayer={false} />
                    </Document>
                )}
            </div>
        </main>
    );
}