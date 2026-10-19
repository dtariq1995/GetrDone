import { useEffect, useRef, type ReactNode } from 'react';

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

// Built on the native <dialog> element. showModal() gives us, for free:
// focus moves into the dialog and stays there, Escape closes it, and the rest
// of the page can't be clicked. Render it only while it should be open.
export function Modal({ title, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      // Fires for Escape as well as dialog.close().
      onClose={onClose}
      // A click on the dialog element itself (not its contents) is a click on
      // the dimmed backdrop.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-full max-w-md rounded-2xl bg-white p-0 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
