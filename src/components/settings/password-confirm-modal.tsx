import { AnimatePresence, motion } from "framer-motion";

interface Props {

  open: boolean;

  title?: string;

  message?: string;

  onAccept: () => void;

  onCancel: () => void;
}

export default function PasswordConfirmModal({

  open,

  title = "Vas a cambiar tu contraseña",

  message = "Asegúrate de apuntarla correctamente.",

  onAccept,

  onCancel

}: Props) {

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <motion.div
            className="w-full max-w-md rounded-3xl bg-white p-8"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >

        <h2 className="text-2xl font-bold">

          {title}

        </h2>

        <p className="mt-4">

          {message}

        </p>

        <div className="mt-6 flex gap-3">

          <button 
          onClick={onCancel}
          className="mt-4 rounded bg-black px-6 py-3 text-white">

            Cancelar

          </button>

          <button 
          onClick={onAccept}
          className="mt-4 rounded bg-action px-6 py-3 text-white">

            Aceptar

          </button>

        </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

  );
}