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