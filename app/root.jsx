import { Outlet, Scripts, ScrollRestoration } from "react-router";
import { AuthProvider } from "../src/context/AuthContext.jsx";
import "../src/index.css";
import PageLoader from "../src/component/PageLoader.jsx";

export function HydrateFallback() {
    return <PageLoader  />
}

export function Layout({ children }) {
    return (
        <html lang="fr">
        <head>
            <meta charSet="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
        </head>
        <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        </body>
        </html>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <Outlet />
        </AuthProvider>
    );
}