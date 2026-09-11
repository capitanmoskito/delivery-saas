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

  if (!open) return null;

  return (

    <div className="fixed inset-0 flex items-center justify-center bg-black/50">

      <div className="rounded-3xl bg-white p-8">

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

      </div>

      

    </div>

  );
}