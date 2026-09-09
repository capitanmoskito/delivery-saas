export default function BusinessKpi({

  title,

  value

}: {

  title: string;

  value: string | number;

}) {

  return (

    <div className="rounded border p-4">

      <p>{title}</p>

      <h2 className="text-3xl font-bold">

        {value}

      </h2>

    </div>
  );
}