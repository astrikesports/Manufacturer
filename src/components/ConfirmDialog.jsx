export default function ConfirmDialog({
  open,
  title = "Confirm",
  message,
  onConfirm,
  onCancel,
  confirmText = "OK",
  cancelText = "Cancel"
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
      <div className="bg-white w-[360px] rounded-xl shadow-lg p-5">
        <h3 className="text-base font-semibold text-gray-800 mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mb-5">
          {message}
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded bg-gray-200 hover:bg-gray-300"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
