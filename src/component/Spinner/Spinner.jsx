export default function Spinner() {
    return (
        <div className="relative flex items-center justify-center bg-gray-100 rounded-lg z-10">
            <div
                role="status"
                aria-label="Chargement en cours"
                className="w-10 h-10 border-4 border-[#901C1C] border-t-transparent rounded-full animate-spin"
            />
        </div>
    );
}