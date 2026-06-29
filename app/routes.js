import { index, layout, route } from "@react-router/dev/routes";

export default [
    index("../src/pages/login/Login.jsx"),
    route("*", "../src/pages/notFound/NotFound.jsx"),

    layout("../src/component/ProtectedRoute.jsx", [
        route("dashboard", "../src/pages/dashboard/Dashboard.jsx"),
        route("profile", "../src/pages/profile/Profile.jsx"),
    ]),
];