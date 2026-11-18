export default function LoaderOverlay({ text = "Loading..." }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
      <div className="bg-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3">
        <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold text-gray-700">
          {text}
        </span>
      </div>
    </div>
  );
}
