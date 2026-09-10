export default function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {

  return (

    <button
      {...props}
      className="
        rounded-xl
        bg-[#D95D39]
        px-5
        py-3
        text-white
        font-medium
        transition
        hover:opacity-90
      "
    >
      {children}
    </button>

  );
}