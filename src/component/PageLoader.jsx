export default function PageLoader() {
    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    border: "4px solid #e5e7eb",
                    borderTopColor: "#0B23F4",
                    animation: "spin 0.8s linear infinite"
                }} />
                <p style={{ color: "#9ca3af", fontSize: 14 }}>Chargement...</p>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}