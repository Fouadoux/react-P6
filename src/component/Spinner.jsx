export default function Spinner() {
    return (
        <div className="flex items-center justify-center w-full h-[300px]">
            <div className="w-10 h-10 border-4 border-[#901C1C] border-t-transparent rounded-full animate-spin" />
        </div>
    );
}