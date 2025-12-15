import { auth } from "./firebase";

import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword, sendPasswordResetEmail, updatePassword, sendEmailVerification, signInWithPopup } from "firebase/auth";

export const doCreateUserWithEmailAndPassword = (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
};

export const doSignInWithEmailAndPassword = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
};

export const doSignInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    //result.user store if wanted
    return result
}

export const doSignOut = () => {
    return auth.signOut();
}

export const doPasswordReset = (email: string) => {
    return sendPasswordResetEmail(auth, email);
}

export const doPasswordChange = (password: string) => {
    return updatePassword(auth.currentUser, password);
}

export const doSendEmailVerification = () => {
    return sendEmailVerification(auth.currentUser, {
        url: `${window.location.origin}/home`,
    })
}