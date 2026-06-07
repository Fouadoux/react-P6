export default function Spinner() {
    return (
        <div className="flex items-center justify-center w-full h-full min-h-[300px]">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#0B23F4] rounded-full animate-spin" />
        </div>
    );
}