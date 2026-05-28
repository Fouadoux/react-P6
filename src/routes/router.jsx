import { createBrowserRouter } from "react-router-dom"
import Login from "../pages/login/Login.jsx"
import Dashboard from "../pages/dashboard/Dashboard.jsx"
import Profile from "../pages/profile/Profile.jsx"
import ProtectedRoute from "../component/ProtectedRoute.jsx"

export const router = createBrowserRouter([
    { path: "/", element: <Login /> },
    {
        path: "/dashboard",
        element: (
            <ProtectedRoute>
                <Dashboard />
            </ProtectedRoute>
        ),
    },
    {
        path: "/profile",
        element: (
            <ProtectedRoute>
                <Profile />
            </ProtectedRoute>
        ),
    },
])